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
        return ResponseEntity.ok(authService.getSuppliers(estateId, search, limit));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<UserResponse> getUser(@PathVariable java.util.UUID userId) {
        return ResponseEntity.ok(authService.getUser(userId));
    }
}
