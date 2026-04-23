package com.dalupotha.auth.controller;

import com.dalupotha.auth.dto.AuthDtos.*;
import com.dalupotha.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/auth/login
     * Transport Agent login with employee ID + PIN
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> staffLogin(@Valid @RequestBody StaffLoginRequest request) {
        return ResponseEntity.ok(authService.staffLogin(request));
    }

    /**
     * POST /api/auth/supplier/login
     * Small Holder (Supplier) login with contact number + PIN
     */
    @PostMapping("/supplier/login")
    public ResponseEntity<AuthResponse> supplierPinLogin(@Valid @RequestBody SupplierPinLoginRequest request) {
        return ResponseEntity.ok(authService.supplierPinLogin(request));
    }

    /**
     * POST /api/auth/otp/send
     * Send OTP to a Small Holder's phone number
     */
    @PostMapping("/otp/send")
    public ResponseEntity<OtpSendResponse> sendOtp(@Valid @RequestBody OtpSendRequest request) {
        return ResponseEntity.ok(authService.sendOtp(request));
    }

    /**
     * POST /api/auth/otp/verify
     * Verify OTP and return JWT for an existing Small Holder
     */
    @PostMapping("/otp/verify")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        return ResponseEntity.ok(authService.verifyOtp(request));
    }

    /**
     * POST /api/auth/small-holder/register
     * Register a new Small Holder (requires valid OTP)
     */
    @PostMapping("/small-holder/register")
    public ResponseEntity<AuthResponse> registerSmallHolder(
            @Valid @RequestBody SmallHolderRegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authService.registerSmallHolder(request));
    }

    @PostMapping("/agent/register")
    public ResponseEntity<AuthResponse> registerAgent(
            @Valid @RequestBody AgentRegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authService.registerAgent(request));
    }

    /**
     * GET /api/auth/suppliers
     * Fetch suppliers for picker, filtered by estateId
     */
    @GetMapping("/suppliers")
    public ResponseEntity<java.util.List<com.dalupotha.auth.dto.SupplierSummaryResponse>> getSuppliers(
            @RequestParam(required = false) java.util.UUID estateId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer limit
    ) {
        return ResponseEntity.ok(authService.getSuppliers(estateId, search, limit));
    }
}
