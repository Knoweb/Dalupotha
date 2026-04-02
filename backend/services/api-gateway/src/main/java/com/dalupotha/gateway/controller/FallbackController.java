package com.dalupotha.gateway.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @GetMapping("/auth")
    public ResponseEntity<Map<String, String>> authFallback() {
        return ResponseEntity.status(503).body(Map.of(
                "status", "503",
                "error",   "Service Unavailable",
                "message", "Auth service is temporarily unavailable. Please try again."
        ));
    }

    @GetMapping("/default")
    public ResponseEntity<Map<String, String>> defaultFallback() {
        return ResponseEntity.status(503).body(Map.of(
                "status", "503",
                "error",   "Service Unavailable",
                "message", "The requested service is temporarily unavailable."
        ));
    }
}
