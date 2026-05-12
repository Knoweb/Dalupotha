package com.dalupotha.auth.service;

import com.dalupotha.auth.dto.AuthDtos;
import com.dalupotha.auth.dto.AuthDtos.*;
import com.dalupotha.auth.entity.*;
import com.dalupotha.auth.repository.*;
import com.dalupotha.auth.security.JwtTokenProvider;
import jakarta.validation.Valid;
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
import java.time.Duration;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Pattern BCRYPT_HASH_PATTERN = Pattern.compile("^\\$2[aby]?\\$\\d{2}\\$.{53}$");

    private final UserRepository        userRepository;
    private final SmallHolderRepository smallHolderRepository;
    private final TransportAgentRepository transportAgentRepository;
    private final EstateRepository      estateRepository;
    private final OtpRepository         otpRepository;
    private final JwtTokenProvider      jwtTokenProvider;
    private final PasswordEncoder       passwordEncoder;
    private final OtpSimulatorService   otpSimulatorService;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Value("${otp.expiry-minutes:5}")
    private int otpExpiryMinutes;

    @Value("${jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    // ────────────────────────────────────────────
    // 1. Staff / TA Login
    // ────────────────────────────────────────────
    public AuthResponse staffLogin(StaffLoginRequest request) {
        User user = userRepository.findByEmail(request.getEmployeeId())
                .or(() -> userRepository.findByUsername(request.getEmployeeId()))
                .or(() -> userRepository.findByEmployeeId(request.getEmployeeId()))
                .or(() -> userRepository.findByContact(request.getEmployeeId()))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid username/email or password"));

        if (!isValidPin(user, request.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid employee ID or Password");
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

        user.setLastActive(LocalDateTime.now());
        userRepository.save(user);

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

        log.info("Staff login successful: {} ({}) - Estate: {}. Returning FullName: {}", 
            user.getEmployeeId(), user.getRole(), estateName, user.getFullName());
        return new AuthResponse(token, user.getRole().name(), user.getUserId().toString(),
                user.getEmployeeId(), user.getFullName(), user.getContact(),
                routeName, estateId, estateName, arcs, null, jwtExpirationMs / 1000);
    }

    // ────────────────────────────────────────────
    // 2. Small Holder (Supplier) PIN Login
    // ────────────────────────────────────────────
    public AuthResponse supplierPinLogin(@Valid SupplierPinLoginRequest request) {
        log.info("Attempting supplier PIN login for passbook: {}", request.getPassbookNo());

        SmallHolder sh = smallHolderRepository.findByPassbookNoIgnoreCase(request.getPassbookNo())
                .orElseThrow(() -> {
                    log.warn("Login failed: Passbook not found: {}", request.getPassbookNo());
                    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Passbook ID or PIN");
                });

        User user = sh.getUser();
        if (user == null || !isValidPin(user, request.getPin())) {
            log.warn("Login failed: Incorrect PIN for passbook: {}", request.getPassbookNo());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Passbook ID or PIN");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            log.warn("Login failed: Account {} is not active (Status: {})", request.getPassbookNo(), user.getStatus());
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is not active");
        }

        String token = jwtTokenProvider.generateToken(
                user.getUserId(), "SH", null, user.getFullName());

        user.setLastActive(LocalDateTime.now());
        userRepository.save(user);

        String routeName = null;
        UUID estateId = (sh.getEstate() != null) ? sh.getEstate().getEstateId() : null;
        String estateName = (sh.getEstate() != null) ? sh.getEstate().getName() : null;

        log.info("Supplier login successful: {} ({})", user.getFullName(), request.getPassbookNo());
        AuthResponse response = new AuthResponse(token, "SH", user.getUserId().toString(),
                null, user.getFullName(), user.getContact(),
                routeName, estateId, estateName, sh.getArcs(), sh.getPassbookNo(), jwtExpirationMs / 1000);
        
        response.setSupplierId(sh.getSupplierId().toString());
        if (sh.getInCharge() != null) {
            response.setInChargeName(sh.getInCharge().getFullName());
        }
        return response;
    }

    private boolean isValidPin(User user, String rawPin) {
        String storedPin = user.getHashedPassword();
        if (storedPin == null || storedPin.isBlank()) {
            return false;
        }

        if (isBcryptHash(storedPin)) {
            return passwordEncoder.matches(rawPin, storedPin);
        }

        // Backward compatibility for legacy plain PINs; upgrade to BCrypt on successful login.
        if (storedPin.equals(rawPin)) {
            user.setHashedPassword(passwordEncoder.encode(rawPin));
            userRepository.save(user);
            log.info("Upgraded legacy PIN format to BCrypt for userId={}", user.getUserId());
            return true;
        }

        return false;
    }

    private boolean isBcryptHash(String value) {
        return BCRYPT_HASH_PATTERN.matcher(value).matches();
    }

    // ────────────────────────────────────────────
    // 2. Send OTP (Small Holder login/registration)
    // ────────────────────────────────────────────
    @Transactional
    public OtpSendResponse sendOtp(OtpSendRequest request) {
        // Early uniqueness check if registering
        if ("REGISTRATION".equalsIgnoreCase(request.getPurpose())) {
            // Check Contact Number
            if (userRepository.findByContact(request.getContact()).isPresent()) {
                log.warn("Registration failed: Contact number already exists: {}", request.getContact());
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Contact number already registered");
            }
            // Check Passbook Number (Supplier specific)
            if (request.getPassbookNo() != null && !request.getPassbookNo().isBlank()) {
                if (smallHolderRepository.findByPassbookNoIgnoreCase(request.getPassbookNo()).isPresent()) {
                    log.warn("Registration failed: Passbook number already exists: {}", request.getPassbookNo());
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Passbook number already registered");
                }
            }
        }

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

        user.setLastActive(LocalDateTime.now());
        userRepository.save(user);

        String passbookNo = null;
        String routeName = null;
        UUID estateId = null;
        String estateName = null;
        BigDecimal arcs = null;
        String inChargeName = null;

        if (user.getRole() == UserRole.SH) {
            SmallHolder sh = smallHolderRepository.findByUser(user).orElse(null);
            if (sh != null) {
                arcs = sh.getArcs();
                passbookNo = sh.getPassbookNo();
                if (sh.getEstate() != null) {
                    estateId = sh.getEstate().getEstateId();
                    estateName = sh.getEstate().getName();
                }
                if (sh.getInCharge() != null) {
                    inChargeName = sh.getInCharge().getFullName();
                }
            }
        } else if (user.getRole() == UserRole.TA) {
            TransportAgent ta = transportAgentRepository.findByUser(user).orElse(null);
            if (ta != null) {
                routeName = ta.getRouteName();
                if (ta.getEstate() != null) {
                    estateId = ta.getEstate().getEstateId();
                    estateName = ta.getEstate().getName();
                }
            }
        }

        log.info("OTP login successful for: {} - Estate: {}", request.getContact(), estateName);
        AuthResponse response = new AuthResponse(token, user.getRole().name(), user.getUserId().toString(),
                user.getEmployeeId(), user.getFullName(), user.getContact(),
                routeName, estateId, estateName, arcs, passbookNo, jwtExpirationMs / 1000);
        response.setInChargeName(inChargeName);
        return response;
    }

    // ────────────────────────────────────────────
    // 4. Small Holder Registration
    // ────────────────────────────────────────────
    @Transactional
    public AuthResponse registerSmallHolder(SmallHolderRegisterRequest request) {
        if (!"MANUAL".equals(request.getOtpCode())) {
            OtpCode otpCode = otpRepository
                    .findTopByContactAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                            request.getContact(), LocalDateTime.now())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.UNAUTHORIZED, "Invalid or expired OTP"));

            if (!otpCode.getCode().equals(request.getOtpCode())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid OTP code");
            }
            otpCode.setUsed(true);
            otpRepository.save(otpCode);
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

        User inCharge = null;
        if (request.getInChargeId() != null && !request.getInChargeId().isBlank()) {
            inCharge = userRepository.findById(UUID.fromString(request.getInChargeId())).orElse(null);
        }

        SmallHolder smallHolder = SmallHolder.builder()
                .user(user)
                .passbookNo(request.getPassbookNo())
                .landName(request.getLandName())
                .address(request.getAddress())
                .estate(estate)
                .arcs(request.getArcs())
                .gpsLat(request.getGpsLat() != null ? BigDecimal.valueOf(request.getGpsLat()) : null)
                .gpsLong(request.getGpsLong() != null ? BigDecimal.valueOf(request.getGpsLong()) : null)
                .inCharge(inCharge)
                .build();
        smallHolderRepository.save(smallHolder);

        String token = jwtTokenProvider.generateToken(
                user.getUserId(), "SH", null, user.getFullName());

        log.info("Small Holder registered: {} ({}) passbook: {} Estate: {}",
                user.getFullName(), request.getContact(), request.getPassbookNo(), 
                estate != null ? estate.getName() : "None");
        
        AuthResponse response = new AuthResponse(token, "SH", user.getUserId().toString(),
                null, user.getFullName(), user.getContact(),
                null, estate != null ? estate.getEstateId() : null,
                estate != null ? estate.getName() : null,
                smallHolder.getArcs(), smallHolder.getPassbookNo(), jwtExpirationMs / 1000);
        if (inCharge != null) {
            response.setInChargeName(inCharge.getFullName());
        }
        return response;
    }

    // ────────────────────────────────────────────
    // 5. Transport Agent (TA) Registration
    // ────────────────────────────────────────────
    @Transactional
    public AuthResponse registerAgent(AgentRegisterRequest request) {
        if (!"MANUAL".equals(request.getOtpCode())) {
            OtpCode otpCode = otpRepository
                    .findTopByContactAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                            request.getContact(), LocalDateTime.now())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.UNAUTHORIZED, "Invalid or expired OTP"));

            if (!otpCode.getCode().equals(request.getOtpCode())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid OTP code");
            }
            otpCode.setUsed(true);
            otpRepository.save(otpCode);
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

        transportAgentRepository.save(transportAgent);

        String token = jwtTokenProvider.generateToken(
                user.getUserId(), "TA", user.getEmployeeId(), user.getFullName());

        log.info("Transport Agent registered: {} ({}) EMP_ID: {} Estate: {}",
                user.getFullName(), request.getContact(), request.getEmployeeId(),
                estate != null ? estate.getName() : "None");
        
        return new AuthResponse(token, "TA", user.getUserId().toString(),
                user.getEmployeeId(), user.getFullName(), user.getContact(),
                null, estate != null ? estate.getEstateId() : null,
                estate != null ? estate.getName() : null,
                null, null, jwtExpirationMs / 1000);
    }

    // ────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────
    public java.util.List<com.dalupotha.auth.dto.SupplierSummaryResponse> getSuppliers(UUID estateId, String search, Integer limit) {
        log.info("Fetching suppliers for estateId: {}, search: {}, limit: {}", estateId, search, limit);
        int pageSize = limit != null ? Math.min(limit, 200) : 100;
        String searchTerm = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        boolean hasSearch = searchTerm != null;
        String searchPattern = hasSearch ? "%" + searchTerm.toLowerCase() + "%" : null;

        return smallHolderRepository.searchSuppliers(estateId, hasSearch, searchPattern, org.springframework.data.domain.PageRequest.of(0, pageSize))
                .stream()
                .map(sh -> new com.dalupotha.auth.dto.SupplierSummaryResponse(
                        sh.getSupplierId(),
                        sh.getUser().getFullName(),
                        sh.getPassbookNo(),
                        sh.getLandName(),
                        sh.getEstate() != null ? sh.getEstate().getEstateId() : null,
                        sh.getArcs()
                ))
                .toList();
    }

    private String generateOtpCode() {
        SecureRandom random = new SecureRandom();
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }

    public UserResponse getUser(java.util.UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return new UserResponse(user.getUserId(), user.getFullName(), user.getEmployeeId(), user.getContact(), user.getRole().name());
    }

    @Transactional
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        log.info("Starting cleanup for user deletion: {}", userId);

        // Remove the block from small_holders.in_charge_id
        try {
            jdbcTemplate.update("UPDATE small_holders SET in_charge_id = NULL WHERE in_charge_id = ?", userId);
        } catch (Exception e) {
            log.warn("Failed to nullify in_charge_id for user {}", userId, e);
        }

        // Clean up OTP codes for this user's contact number
        try {
            jdbcTemplate.update("DELETE FROM otp_codes WHERE contact = ?", user.getContact());
        } catch (Exception e) {
            log.warn("Failed to clean up otp_codes for user {}", userId, e);
        }

        // The database's ON DELETE CASCADE will handle small_holders.user_id and transport_agents.user_id
        userRepository.delete(user);
        
        log.info("User deletion complete. User ID: {}", userId);
    }

    @Transactional
    public void updateUserStatus(UUID userId, String status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setStatus(UserStatus.valueOf(status.toUpperCase()));
        userRepository.save(user);
    }

    public DetailedUserResponse getDetailedUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        DetailedUserResponse res = DetailedUserResponse.builder()
                .userId(user.getUserId())
                .id(user.getEmployeeId() != null ? user.getEmployeeId() : "N/A")
                .name(user.getFullName())
                .role(user.getRole().name())
                .status(user.getStatus().name())
                .contact(user.getContact())
                .email(user.getEmail())
                .nic(user.getNic())
                .birthdate(user.getBirthdate())
                .active(getTimeAgo(user.getLastActive() != null ? user.getLastActive() : user.getUpdatedAt()))
                .build();

        if (user.getEstate() != null) {
            res.setEstateId(user.getEstate().getEstateId());
            res.setEstateName(user.getEstate().getName());
        }

        if (user.getRole() == UserRole.SH) {
            smallHolderRepository.findByUser(user).ifPresent(sh -> {
                res.setPassbookNo(sh.getPassbookNo());
                res.setLandName(sh.getLandName());
                res.setAddress(sh.getAddress());
                res.setArcs(sh.getArcs());
                if (sh.getInCharge() != null) {
                    res.setInChargeName(sh.getInCharge().getFullName());
                    res.setInChargeId(sh.getInCharge().getUserId());
                }
                res.setId(sh.getPassbookNo());
            });
        }

        return res;
    }

    @Transactional
    public void updateUser(UUID userId, DetailedUserResponse request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setFullName(request.getName());
        user.setContact(request.getContact());
        user.setEmail(request.getEmail());

        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setHashedPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getEstateId() != null) {
            estateRepository.findById(request.getEstateId()).ifPresent(user::setEstate);
        } else {
            user.setEstate(null);
        }

        if (user.getRole() == UserRole.SH) {
            smallHolderRepository.findByUser(user).ifPresent(sh -> {
                sh.setPassbookNo(request.getPassbookNo());
                sh.setLandName(request.getLandName());
                sh.setAddress(request.getAddress());
                sh.setArcs(request.getArcs());
                if (request.getInChargeId() != null) {
                    userRepository.findById(request.getInChargeId()).ifPresent(sh::setInCharge);
                }
                smallHolderRepository.save(sh);
            });
        }
        userRepository.save(user);
    }

    public java.util.List<AuthDtos.UserSummaryListResponse> listUsers(UUID estateId) {
        log.info("Fetching all users for estateId: {}", estateId);
        java.util.List<User> users;
        if (estateId != null) {
            users = userRepository.findByEstate_EstateId(estateId);
        } else {
            users = userRepository.findAll();
        }
        java.util.Map<UUID, String> supplierIds = new java.util.HashMap<>();
        java.util.Map<UUID, String> shPassbooks = new java.util.HashMap<>();
        smallHolderRepository.findAll().forEach(sh -> {
            if (sh.getUser() != null) {
                shPassbooks.put(sh.getUser().getUserId(), sh.getPassbookNo());
                supplierIds.put(sh.getUser().getUserId(), sh.getSupplierId().toString());
            }
        });

        log.info("Repository returned {} users", users.size());
        return users.stream()
            .sorted(java.util.Comparator.comparing(User::getCreatedAt))
            .map(u -> {
                String displayId = u.getEmployeeId();
                if (displayId == null) {
                    if (u.getRole() == UserRole.SH && shPassbooks.containsKey(u.getUserId())) {
                        displayId = shPassbooks.get(u.getUserId());
                    } else {
                        displayId = "SH-" + u.getUserId().toString().substring(0,4);
                    }
                }
                return new AuthDtos.UserSummaryListResponse(
                    displayId,
                    u.getUserId().toString(),
                    u.getRole() == UserRole.SH ? supplierIds.get(u.getUserId()) : null,
                    u.getFullName(),
                    u.getRole().name(),
                    u.getStatus().name(),
                    getTimeAgo(u.getLastActive() != null ? u.getLastActive() : u.getUpdatedAt())
                );
            }).toList();
    }

    private String getTimeAgo(LocalDateTime time) {
        if (time == null) return "Unknown";
        Duration duration = Duration.between(time, LocalDateTime.now());
        long days = duration.toDays();
        if (days > 0) return days + (days == 1 ? " day ago" : " days ago");
        long hours = duration.toHours();
        if (hours > 0) return hours + (hours == 1 ? " hr ago" : " hrs ago");
        long mins = duration.toMinutes();
        if (mins > 0) return mins + (mins == 1 ? " min ago" : " mins ago");
        return "Just now";
    }

    public AuthDtos.AuthResponse createStaffUser(AuthDtos.CreateUserRequest request) {
        log.info("Manager creating user: {}", request.getEmployeeId());
        
        java.util.Optional<User> existing = userRepository.findByEmployeeId(request.getEmployeeId());
        if (existing.isPresent()) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT, "Employee ID already exists");
        }
        
        Estate estate = null;
        if (request.getEstateId() != null) {
            estate = estateRepository.findById(request.getEstateId()).orElse(null);
        }
        
        String hashedPassword = passwordEncoder.encode(request.getPassword());

        User newUser = User.builder()
                .employeeId(request.getEmployeeId())
                .email(request.getEmail())
                .contact(request.getContact() != null && !request.getContact().isBlank() ? request.getContact()
                        : request.getEmail() != null && !request.getEmail().isBlank() ? request.getEmail()
                        : request.getEmployeeId())
                .fullName(request.getFullName())
                .role(UserRole.valueOf(request.getRole()))
                .estate(estate)
                .hashedPassword(hashedPassword)
                .nic(request.getNic())
                .birthdate(request.getBirthdate())
                .username(request.getUsername())
                .status(UserStatus.ACTIVE)
                .build();
                
        userRepository.save(newUser);
        
        return new AuthDtos.AuthResponse(
                null,
                newUser.getRole().name(),
                newUser.getUserId().toString(),
                newUser.getEmployeeId(),
                newUser.getFullName(),
                newUser.getEmail(),
                null,
                estate != null ? estate.getEstateId() : null,
                estate != null ? estate.getName() : null,
                null,
                null,
                3600
        );
    }

    public java.util.Map<String, Object> getSupplierAssignedAgent(UUID supplierId) {
        SmallHolder sh = smallHolderRepository.findById(supplierId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Supplier not found"));
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        if (sh.getInCharge() != null) {
            result.put("inChargeId", sh.getInCharge().getUserId().toString());
            result.put("inChargeName", sh.getInCharge().getFullName());
        }
        return result;
    }

    public java.util.Map<String, Object> getSupplierProfile(UUID supplierId) {
        SmallHolder sh = smallHolderRepository.findById(supplierId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Supplier not found"));
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("supplierId", sh.getSupplierId().toString());
        result.put("passbookNo", sh.getPassbookNo());
        result.put("landName", sh.getLandName());
        result.put("address", sh.getAddress());
        result.put("arcs", sh.getArcs());
        if (sh.getInCharge() != null) {
            result.put("inChargeId", sh.getInCharge().getUserId().toString());
            result.put("inChargeName", sh.getInCharge().getFullName());
        }
        return result;
    }
}
