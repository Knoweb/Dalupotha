package com.dalupotha.auth.service;

import com.dalupotha.auth.dto.AuthDtos.*;
import com.dalupotha.auth.entity.*;
import com.dalupotha.auth.repository.*;
import com.dalupotha.auth.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository        userRepository;
    private final SmallHolderRepository smallHolderRepository;
    private final TransportAgentRepository transportAgentRepository;
    private final EstateRepository      estateRepository;
    private final OtpRepository         otpRepository;
    private final JwtTokenProvider      jwtTokenProvider;
    private final PasswordEncoder       passwordEncoder;
    private final OtpSimulatorService   otpSimulatorService;

    @Value("${otp.expiry-minutes:5}")
    private int otpExpiryMinutes;

    @Value("${jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    // ────────────────────────────────────────────
    // 1. Staff / TA Login
    // ────────────────────────────────────────────
    public AuthResponse staffLogin(StaffLoginRequest request) {
        User user = userRepository.findByEmployeeId(request.getEmployeeId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid employee ID or PIN"));

        if (user.getHashedPassword() == null ||
            !passwordEncoder.matches(request.getPin(), user.getHashedPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid employee ID or PIN");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is not active");
        }

        String token = jwtTokenProvider.generateToken(
                user.getUserId(), user.getRole().name(),
                user.getEmployeeId(), user.getFullName());

        log.info("Generating token for user: {}, Role: {}, EmpID: {}, Name: {}",
                user.getUserId(), user.getRole().name(),
                user.getEmployeeId(), user.getFullName());

        String routeName = null;
        UUID estateId = null;
        String estateName = null;
        BigDecimal arcs = null;

        if (user.getEstate() != null) {
            estateId = user.getEstate().getEstateId();
            estateName = user.getEstate().getName();
        }

        if (user.getRole() == UserRole.TA) {
            TransportAgent ta = transportAgentRepository.findByUser(user).orElse(null);
            if (ta != null) {
                routeName = ta.getRouteName();
                if (ta.getEstate() != null) {
                    estateId = ta.getEstate().getEstateId();
                    estateName = ta.getEstate().getName();
                }
            }
        } else if (user.getRole() == UserRole.SH) {
            SmallHolder sh = smallHolderRepository.findByUser(user).orElse(null);
            if (sh != null) {
                arcs = sh.getArcs();
                if (sh.getEstate() != null) {
                    estateId = sh.getEstate().getEstateId();
                    estateName = sh.getEstate().getName();
                }
            }
        }

        log.info("Staff login successful: {} ({}) - Estate: {}", user.getEmployeeId(), user.getRole(), estateName);
        return new AuthResponse(token, user.getRole().name(), user.getUserId().toString(),
                user.getEmployeeId(), user.getFullName(), user.getContact(),
                routeName, estateId, estateName, arcs, jwtExpirationMs / 1000);
    }

    // ────────────────────────────────────────────
    // 2. Small Holder (Supplier) PIN Login
    // ────────────────────────────────────────────
    public AuthResponse supplierPinLogin(SupplierPinLoginRequest request) {
        SmallHolder sh = smallHolderRepository.findByPassbookNo(request.getPassbookNo())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "No account found for this Passbook ID. Please register first."));

        User user = sh.getUser();

        if (user.getHashedPassword() == null ||
            !passwordEncoder.matches(request.getPin(), user.getHashedPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Passbook ID or PIN");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is not active");
        }

        String token = jwtTokenProvider.generateToken(
                user.getUserId(), user.getRole().name(),
                user.getEmployeeId(), user.getFullName());

        UUID estateId = null;
        String estateName = null;
        BigDecimal arcs = sh.getArcs();

        if (sh.getEstate() != null) {
            estateId = sh.getEstate().getEstateId();
            estateName = sh.getEstate().getName();
        }

        log.info("Supplier PIN login successful: passbookNo={} - Estate: {}", request.getPassbookNo(), estateName);
        return new AuthResponse(token, user.getRole().name(), user.getUserId().toString(),
                null, user.getFullName(), user.getContact(),
                null, estateId, estateName, arcs, jwtExpirationMs / 1000);
    }

    // ────────────────────────────────────────────
    // 2. Send OTP (Small Holder login/registration)
    // ────────────────────────────────────────────
    @Transactional
    public OtpSendResponse sendOtp(OtpSendRequest request) {
        otpRepository.invalidateAllForContact(request.getContact());

        String code = generateOtpCode();
        OtpCode otpCode = OtpCode.builder()
                .contact(request.getContact())
                .code(code)
                .purpose(request.getPurpose())
                .isUsed(false)
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes))
                .build();

        otpRepository.save(otpCode);
        otpSimulatorService.sendOtp(request.getContact(), code);

        return new OtpSendResponse(request.getContact(), otpExpiryMinutes);
    }

    // ────────────────────────────────────────────
    // 3. Verify OTP (Small Holder login)
    // ────────────────────────────────────────────
    @Transactional
    public AuthResponse verifyOtp(OtpVerifyRequest request) {
        OtpCode otpCode = otpRepository
                .findTopByContactAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                        request.getContact(), LocalDateTime.now())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid or expired OTP"));

        if (!otpCode.getCode().equals(request.getCode())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid OTP code");
        }

        otpCode.setUsed(true);
        otpRepository.save(otpCode);

        User user = userRepository.findByContact(request.getContact())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No account found for this number. Please register first."));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is not active");
        }

        String token = jwtTokenProvider.generateToken(
                user.getUserId(), user.getRole().name(),
                user.getEmployeeId(), user.getFullName());

        log.info("Generating token for user: {}, Role: {}, EmpID: {}, Name: {}",
                user.getUserId(), user.getRole().name(),
                user.getEmployeeId(), user.getFullName());

        String routeName = null;
        UUID estateId = null;
        String estateName = null;
        BigDecimal arcs = null;

        if (user.getEstate() != null) {
            estateId = user.getEstate().getEstateId();
            estateName = user.getEstate().getName();
        }

        if (user.getRole() == UserRole.TA) {
            TransportAgent ta = transportAgentRepository.findByUser(user).orElse(null);
            if (ta != null) {
                routeName = ta.getRouteName();
                if (ta.getEstate() != null) {
                    estateId = ta.getEstate().getEstateId();
                    estateName = ta.getEstate().getName();
                }
            }
        } else if (user.getRole() == UserRole.SH) {
            SmallHolder sh = smallHolderRepository.findByUser(user).orElse(null);
            if (sh != null) {
                arcs = sh.getArcs();
                if (sh.getEstate() != null) {
                    estateId = sh.getEstate().getEstateId();
                    estateName = sh.getEstate().getName();
                }
            }
        }

        log.info("OTP login successful for: {} - Estate: {}", request.getContact(), estateName);
        return new AuthResponse(token, user.getRole().name(), user.getUserId().toString(),
                user.getEmployeeId(), user.getFullName(), user.getContact(),
                routeName, estateId, estateName, arcs, jwtExpirationMs / 1000);
    }

    // ────────────────────────────────────────────
    // 4. Small Holder Registration
    // ────────────────────────────────────────────
    @Transactional
    public AuthResponse registerSmallHolder(SmallHolderRegisterRequest request) {
        OtpCode otpCode = otpRepository
                .findTopByContactAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                        request.getContact(), LocalDateTime.now())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid or expired OTP"));

        if (!otpCode.getCode().equals(request.getOtpCode())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid OTP code");
        }

        if (userRepository.existsByContact(request.getContact())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "An account already exists for this phone number");
        }

        if (request.getPassbookNo() != null &&
            smallHolderRepository.existsByPassbookNo(request.getPassbookNo())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Passbook number already registered");
        }

        Estate estate = null;
        if (request.getEstateId() != null) {
            estate = estateRepository.findById(request.getEstateId()).orElse(null);
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .contact(request.getContact())
                .hashedPassword(passwordEncoder.encode(request.getPin()))
                .role(UserRole.SH)
                .estate(estate)
                .status(UserStatus.ACTIVE)
                .build();
        userRepository.save(user);

        SmallHolder smallHolder = SmallHolder.builder()
                .user(user)
                .passbookNo(request.getPassbookNo())
                .landName(request.getLandName())
                .address(request.getAddress())
                .estate(estate)
                .arcs(request.getArcs())
                .gpsLat(request.getGpsLat() != null ? BigDecimal.valueOf(request.getGpsLat()) : null)
                .gpsLong(request.getGpsLong() != null ? BigDecimal.valueOf(request.getGpsLong()) : null)
                .build();
        smallHolderRepository.save(smallHolder);

        otpCode.setUsed(true);
        otpRepository.save(otpCode);

        String token = jwtTokenProvider.generateToken(
                user.getUserId(), "SH", null, user.getFullName());

        log.info("Small Holder registered: {} ({}) passbook: {} Estate: {}",
                user.getFullName(), request.getContact(), request.getPassbookNo(), 
                estate != null ? estate.getName() : "None");
        
        return new AuthResponse(token, "SH", user.getUserId().toString(),
                null, user.getFullName(), user.getContact(), 
                null, estate != null ? estate.getEstateId() : null,
                estate != null ? estate.getName() : null,
                smallHolder.getArcs(), jwtExpirationMs / 1000);
    }

    // ────────────────────────────────────────────
    // 5. Transport Agent (TA) Registration
    // ────────────────────────────────────────────
    @Transactional
    public AuthResponse registerAgent(AgentRegisterRequest request) {
        OtpCode otpCode = otpRepository
                .findTopByContactAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                        request.getContact(), LocalDateTime.now())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid or expired OTP"));

        if (!otpCode.getCode().equals(request.getOtpCode())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid OTP code");
        }

        if (userRepository.existsByContact(request.getContact())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "An account already exists for this phone number");
        }

        if (transportAgentRepository.existsByEmployeeId(request.getEmployeeId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Employee ID already registered");
        }

        Estate estate = null;
        if (request.getEstateId() != null) {
            estate = estateRepository.findById(request.getEstateId()).orElse(null);
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .contact(request.getContact())
                .hashedPassword(passwordEncoder.encode(request.getPin()))
                .employeeId(request.getEmployeeId())
                .role(UserRole.TA)
                .estate(estate)
                .status(UserStatus.ACTIVE)
                .build();
        userRepository.save(user);

        TransportAgent transportAgent = TransportAgent.builder()
                .user(user)
                .employeeId(request.getEmployeeId())
                .estate(estate)
                .build();
        transportAgentRepository.save(transportAgent);

        otpCode.setUsed(true);
        otpRepository.save(otpCode);

        String token = jwtTokenProvider.generateToken(
                user.getUserId(), "TA", user.getEmployeeId(), user.getFullName());

        log.info("Transport Agent registered: {} ({}) EMP_ID: {} Estate: {}",
                user.getFullName(), request.getContact(), request.getEmployeeId(),
                estate != null ? estate.getName() : "None");
        
        return new AuthResponse(token, "TA", user.getUserId().toString(),
                user.getEmployeeId(), user.getFullName(), user.getContact(),
                null, estate != null ? estate.getEstateId() : null,
                estate != null ? estate.getName() : null,
                null, jwtExpirationMs / 1000);
    }

    // ────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────
    private String generateOtpCode() {
        SecureRandom random = new SecureRandom();
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }
}
