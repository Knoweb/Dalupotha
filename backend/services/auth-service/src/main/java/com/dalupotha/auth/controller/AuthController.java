package com.dalupotha.auth.controller;

import com.dalupotha.auth.dto.AuthDtos;
import com.dalupotha.auth.dto.AuthDtos.*;
import com.dalupotha.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> staffLogin(@Valid @RequestBody StaffLoginRequest request) {
        return ResponseEntity.ok(authService.staffLogin(request));
    }

    @PostMapping("/supplier/login")
    public ResponseEntity<AuthResponse> supplierPinLogin(@Valid @RequestBody SupplierPinLoginRequest request) {
        return ResponseEntity.ok(authService.supplierPinLogin(request));
    }

    @PostMapping("/otp/send")
    public ResponseEntity<OtpSendResponse> sendOtp(@Valid @RequestBody OtpSendRequest request) {
        return ResponseEntity.ok(authService.sendOtp(request));
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        return ResponseEntity.ok(authService.verifyOtp(request));
    }

    @PostMapping("/small-holder/register")
    public ResponseEntity<AuthResponse> registerSmallHolder(@Valid @RequestBody SmallHolderRegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerSmallHolder(request));
    }

    @PostMapping("/agent/register")
    public ResponseEntity<AuthResponse> registerAgent(@Valid @RequestBody AgentRegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerAgent(request));
    }

    @GetMapping("/suppliers")
    public ResponseEntity<java.util.List<com.dalupotha.auth.dto.SupplierSummaryResponse>> getSuppliers(
            @RequestParam(required = false) java.util.UUID estateId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer limit
    ) {
        log.info("API: getSuppliers called");
        return ResponseEntity.ok(authService.getSuppliers(estateId, search, limit));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<UserResponse> getUser(@PathVariable java.util.UUID userId) {
        log.info("API: getUser called for userId: {}", userId);
        return ResponseEntity.ok(authService.getUser(userId));
    }

    @GetMapping("/users")
    public ResponseEntity<java.util.List<UserSummaryListResponse>> listUsers(
            @RequestParam(required = false) java.util.UUID estateId
    ) {
        log.info("API: listUsers called for estateId: {}", estateId);
        return ResponseEntity.ok(authService.listUsers(estateId));
    }

    @PostMapping("/users")
    public ResponseEntity<AuthResponse> createStaffUser(@Valid @RequestBody CreateUserRequest request) {
        log.info("API: createStaffUser called");
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.createStaffUser(request));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID userId) {
        log.info("API: deleteUser called for: {}", userId);
        authService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/users/{userId}/status")
    public ResponseEntity<Void> updateStatus(@PathVariable UUID userId, @RequestParam String status) {
        log.info("API: updateStatus called for {}: {}", userId, status);
        authService.updateUserStatus(userId, status);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/users/{userId}/detailed")
    public ResponseEntity<DetailedUserResponse> getDetailedUser(@PathVariable UUID userId) {
        log.info("API: getDetailedUser called for: {}", userId);
        return ResponseEntity.ok(authService.getDetailedUser(userId));
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<Void> updateUser(@PathVariable UUID userId, @RequestBody DetailedUserResponse request) {
        log.info("API: updateUser called for: {}", userId);
        authService.updateUser(userId, request);
        return ResponseEntity.ok().build();
    }
}
