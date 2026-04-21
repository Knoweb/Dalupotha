package com.dalupotha.auth.controller;

import com.dalupotha.auth.dto.EstateRegistrationRequest;
import com.dalupotha.auth.entity.Estate;
import com.dalupotha.auth.entity.User;
import com.dalupotha.auth.entity.UserRole;
import com.dalupotha.auth.entity.UserStatus;
import com.dalupotha.auth.repository.EstateRepository;
import com.dalupotha.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth/estates")
@RequiredArgsConstructor
public class EstateController {

    private final EstateRepository estateRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public List<Estate> getAllEstates() {
        return estateRepository.findAll();
    }

    @PostMapping("/register")
    @Transactional
    public Estate registerEstate(@RequestBody EstateRegistrationRequest request) {
        // 1. Create and save Estate
        Estate estate = Estate.builder()
                .name(request.getName())
                .code(request.getCode())
                .address(request.getAddress())
                .phone(request.getPhone())
                .isActive(true)
                .build();
        estate = estateRepository.save(estate);

        // 2. Create Master Admin User for this Estate
        User admin = User.builder()
                .fullName("Master Admin")
                .contact(request.getAdminEmail()) // Use email as primary contact
                .role(UserRole.MG) // Manager role
                .estate(estate)
                .hashedPassword(passwordEncoder.encode(request.getAdminPassword()))
                .status(UserStatus.ACTIVE)
                .build();
        userRepository.save(admin);

        return estate;
    }
}
