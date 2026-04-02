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

    private final UserRepository       userRepository;
    private final SmallHolderRepository smallHolderRepository;
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
                        HttpStatus.UNAUTHORIZED, "Invalid employee ID or password"));

        if (user.getHashedPassword() == null ||
            !passwordEncoder.matches(request.getPassword(), user.getHashedPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid employee ID or password");
        }

        if (!"ACTIVE".equals(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is not active");
        }

        String token = jwtTokenProvider.generateToken(
                user.getUserId(), user.getRole().name(),
                user.getEmployeeId(), user.getFullName());

        log.info("Staff login successful: {} ({})", user.getEmployeeId(), user.getRole());
        return new AuthResponse(token, user.getRole().name(), user.getUserId().toString(),
                user.getEmployeeId(), user.getFullName(), user.getContact(),
                jwtExpirationMs / 1000);
    }

    // ────────────────────────────────────────────
    // 2. Send OTP (Small Holder login/registration)
    // ────────────────────────────────────────────
    @Transactional
    public OtpSendResponse sendOtp(OtpSendRequest request) {
        // Invalidate any existing active OTPs for this contact
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

        // In production: call SMS gateway here
        // For now: simulator logs the OTP
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

        // Mark OTP as used
        otpCode.setUsed(true);
        otpRepository.save(otpCode);

        // Find or handle the user
        User user = userRepository.findByContact(request.getContact())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No account found for this number. Please register first."));

        if (!"ACTIVE".equals(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is not active");
        }

        String token = jwtTokenProvider.generateToken(
                user.getUserId(), user.getRole().name(),
                user.getEmployeeId(), user.getFullName());

        log.info("OTP login successful for: {}", request.getContact());
        return new AuthResponse(token, user.getRole().name(), user.getUserId().toString(),
                user.getEmployeeId(), user.getFullName(), user.getContact(),
                jwtExpirationMs / 1000);
    }

    // ────────────────────────────────────────────
    // 4. Small Holder Registration
    // ────────────────────────────────────────────
    @Transactional
    public AuthResponse registerSmallHolder(SmallHolderRegisterRequest request) {
        // Validate OTP first
        OtpCode otpCode = otpRepository
                .findTopByContactAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                        request.getContact(), LocalDateTime.now())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid or expired OTP"));

        if (!otpCode.getCode().equals(request.getOtpCode())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid OTP code");
        }

        // Check for duplicates
        if (userRepository.existsByContact(request.getContact())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "An account already exists for this phone number");
        }

        // Check passbook uniqueness
        if (request.getPassbookNo() != null &&
            smallHolderRepository.existsByPassbookNo(request.getPassbookNo())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Passbook number already registered");
        }

        // Create user
        User user = User.builder()
                .role(UserRole.SH)
                .fullName(request.getFullName())
                .contact(request.getContact())
                .status("ACTIVE")
                .build();
        user = userRepository.save(user);

        // Resolve in-charge officer (optional)
        User inCharge = null;
        if (request.getInChargeId() != null) {
            inCharge = userRepository.findById(
                UUID.fromString(request.getInChargeId())).orElse(null);
        }

        // Create small holder profile
        SmallHolder smallHolder = SmallHolder.builder()
                .user(user)
                .passbookNo(request.getPassbookNo())
                .landName(request.getLandName())
                .address(request.getAddress())
                .gpsLat(request.getGpsLat() != null ? BigDecimal.valueOf(request.getGpsLat()) : null)
                .gpsLong(request.getGpsLong() != null ? BigDecimal.valueOf(request.getGpsLong()) : null)
                .inCharge(inCharge)
                .build();
        smallHolderRepository.save(smallHolder);

        // Mark OTP as used
        otpCode.setUsed(true);
        otpRepository.save(otpCode);

        String token = jwtTokenProvider.generateToken(
                user.getUserId(), "SH", null, user.getFullName());

        log.info("Small Holder registered: {} ({}) passbook: {}",
                user.getFullName(), request.getContact(), request.getPassbookNo());
        return new AuthResponse(token, "SH", user.getUserId().toString(),
                null, user.getFullName(), user.getContact(), jwtExpirationMs / 1000);
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
