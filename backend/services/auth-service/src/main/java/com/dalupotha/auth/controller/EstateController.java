package com.dalupotha.auth.controller;

import com.dalupotha.auth.entity.Estate;
import com.dalupotha.auth.repository.EstateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth/estates")
@RequiredArgsConstructor
public class EstateController {

    private final EstateRepository estateRepository;

    @GetMapping
    public List<Estate> getAllEstates() {
        return estateRepository.findAll();
    }

    @PostMapping("/register")
    public Estate registerEstate(@RequestBody Estate estate) {
        return estateRepository.save(estate);
    }
}
