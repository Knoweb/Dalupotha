package com.dalupotha.auth.controller;

import com.dalupotha.auth.dto.EstateRegistrationRequest;
import com.dalupotha.auth.entity.Estate;
import com.dalupotha.auth.entity.User;
import com.dalupotha.auth.entity.UserRole;
import com.dalupotha.auth.entity.UserStatus;
import com.dalupotha.auth.repository.EstateRepository;
import com.dalupotha.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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

    /** Returns all active Transport Agents (TA) for a given estate — used during supplier registration. */
    @GetMapping("/{estateId}/agents")
    public ResponseEntity<List<Map<String, Object>>> getAgentsByEstate(@PathVariable UUID estateId) {
        List<User> agents = userRepository.findByEstate_EstateIdAndRoleAndStatus(
                estateId, UserRole.TA, UserStatus.ACTIVE
        );
        List<Map<String, Object>> result = agents.stream()
                .map(u -> Map.<String, Object>of(
                        "userId",     u.getUserId().toString(),
                        "fullName",   u.getFullName() != null ? u.getFullName() : "",
                        "employeeId", u.getEmployeeId() != null ? u.getEmployeeId() : ""
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/register")
    @Transactional
    public Estate registerEstate(@RequestBody EstateRegistrationRequest request) {
        Estate estate = Estate.builder()
                .name(request.getName())
                .code(request.getCode())
                .address(request.getAddress())
                .phone(request.getPhone())
                .isActive(true)
                .build();
        estate = estateRepository.save(estate);

        User admin = User.builder()
                .fullName(request.getManagerName())
                .contact(request.getAdminEmail())
                .role(UserRole.MG)
                .estate(estate)
                .hashedPassword(passwordEncoder.encode(request.getAdminPassword()))
                .status(UserStatus.ACTIVE)
                .build();
        userRepository.save(admin);

        return estate;
    }
}
