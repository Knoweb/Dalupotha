package com.dalupotha.auth.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service("twilio")
public class TwilioSmsService implements SmsProvider {

    @Value("${twilio.account-sid}")
    private String accountSid;

    @Value("${twilio.auth-token}")
    private String authToken;

    @Value("${twilio.phone-number}")
    private String twilioPhoneNumber;

    public void sendOtp(String contact, String code) throws Exception {
        try {
            // Initialize Twilio with credentials
            Twilio.init(accountSid, authToken);

            String message = String.format("Dalupotha OTP: %s", code);
            
            // Format contact number to E.164 if needed
            String formattedContact = formatPhoneNumber(contact);
            
            log.info("Sending OTP via Twilio to {}", formattedContact);
            
            // Send SMS
            Message response = Message.creator(
                    new PhoneNumber(formattedContact),      // To number
                    new PhoneNumber(twilioPhoneNumber),     // From number
                    message                                  // Message body
            ).create();
            log.info("SMS sent successfully. SID: {}", response.getSid());
        } catch (Exception e) {
            log.error("Failed to send OTP via Twilio: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Format phone number to E.164 format (international standard)
     * Handles local Sri Lankan format (07XXXXXXXX) and converts to 947XXXXXXXX
     */
    private String formatPhoneNumber(String contact) {
        String formatted = contact.replace("+", "").replace(" ", "").replace("-", "");

        // If local Sri Lankan format (07XXXXXXXX -> 947XXXXXXXX)
        if (formatted.startsWith("0") && formatted.length() == 10) {
            formatted = "94" + formatted.substring(1);
        }

        // Ensure it starts with +
        if (!formatted.startsWith("+")) {
            formatted = "+" + formatted;
        }

        return formatted;
    }
}
