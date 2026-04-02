package com.dalupotha.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Simulates SMS OTP delivery during development.
 * In production, replace this with a real SMS gateway (e.g. Dialog, Mobitel API).
 */
@Slf4j
@Service
public class OtpSimulatorService {

    public void sendOtp(String contact, String code) {
        // TODO: Replace with real SMS gateway integration
        log.info("============================================");
        log.info("  [DEV OTP SIMULATOR]");
        log.info("  To     : {}", contact);
        log.info("  Code   : {}", code);
        log.info("  Message: Your Dalupotha verification code is {}", code);
        log.info("============================================");
    }
}
