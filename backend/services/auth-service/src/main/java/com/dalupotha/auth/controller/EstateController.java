package com.dalupotha.auth.controller;

import com.dalupotha.auth.dto.EstateRegistrationRequest;
import com.dalupotha.auth.entity.Estate;
import com.dalupotha.auth.entity.User;
import com.dalupotha.auth.entity.UserRole;
import com.dalupotha.auth.entity.UserStatus;
import com.dalupotha.auth.repository.EstateRepository;
import com.dalupotha.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
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

    @GetMapping("/{estateId}")
    public ResponseEntity<Map<String, Object>> getEstate(@PathVariable String estateId) {
        try {
            Estate estate = null;

            try {
                UUID id = UUID.fromString(estateId);
                estate = estateRepository.findById(id).orElse(null);
            } catch (Exception ignored) {
                // If estateId is not a UUID, fall back below.
            }

            // Keep backward compatibility with existing UI behavior.
            if (estate == null) {
                List<Estate> all = estateRepository.findAll();
                if (!all.isEmpty()) {
                    estate = all.get(0);
                }
            }

            if (estate == null) {
                return ResponseEntity.status(404).build();
            }

            Map<String, Object> data = new java.util.HashMap<>();
            data.put("estateId", estate.getEstateId());
            data.put("id", estate.getEstateId());
            data.put("name", estate.getName());
            data.put("code", estate.getCode());
            data.put("phone", estate.getPhone());
            data.put("address", estate.getAddress());
            data.put("isActive", estate.getIsActive());
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Returns all active Transport Agents (TA) for a given estate — used during
     * supplier registration.
     */
    @GetMapping("/{estateId}/agents")
    public ResponseEntity<List<Map<String, Object>>> getAgentsByEstate(@PathVariable UUID estateId) {
        List<User> agents = userRepository.findByEstate_EstateIdAndRoleAndStatus(
                estateId, UserRole.TA, UserStatus.ACTIVE);
        List<Map<String, Object>> result = agents.stream()
                .map(u -> Map.<String, Object>of(
                        "userId", u.getUserId().toString(),
                        "fullName", u.getFullName() != null ? u.getFullName() : "",
                        "employeeId", u.getEmployeeId() != null ? u.getEmployeeId() : ""))
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
                .contact(request.getPhone() != null ? request.getPhone() : request.getAdminEmail())
                .email(request.getAdminEmail())
                .username(request.getAdminEmail())
                .role(UserRole.MG)
                .estate(estate)
                .hashedPassword(passwordEncoder.encode(request.getAdminPassword()))
                .status(UserStatus.ACTIVE)
                .build();
        userRepository.save(admin);

        return estate;
    }

    @PutMapping("/{estateId}")
    @Transactional
    public ResponseEntity<String> updateEstate(@PathVariable String estateId,
            @RequestBody Map<String, String> request) {
        String newName = request.get("name");
        if (newName == null || newName.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Name is required");
        }

        try {
            // Try updating by provided ID
            try {
                UUID id = UUID.fromString(estateId);
                Estate estate = estateRepository.findById(id).orElse(null);
                if (estate != null) {
                    if (request.containsKey("name"))
                        estate.setName(request.get("name"));
                    if (request.containsKey("phone"))
                        estate.setPhone(request.get("phone"));
                    if (request.containsKey("address"))
                        estate.setAddress(request.get("address"));
                    estateRepository.save(estate);
                    return ResponseEntity.ok("Updated by ID");
                }
            } catch (Exception e) {
            }

            // Fallback: update first one
            List<Estate> all = estateRepository.findAll();
            if (!all.isEmpty()) {
                Estate first = all.get(0);
                if (request.containsKey("name"))
                    first.setName(request.get("name"));
                if (request.containsKey("phone"))
                    first.setPhone(request.get("phone"));
                if (request.containsKey("address"))
                    first.setAddress(request.get("address"));
                estateRepository.save(first);
                return ResponseEntity.ok("Updated first found");
            }

            return ResponseEntity.status(404).body("No estate found to update");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Internal Error: " + e.getMessage());
        }
    }
}
