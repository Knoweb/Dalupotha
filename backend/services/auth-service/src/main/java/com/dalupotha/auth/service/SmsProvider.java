package com.dalupotha.auth.service;

public interface SmsProvider {
    void sendOtp(String contact, String code) throws Exception;
}
