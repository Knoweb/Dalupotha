package com.dalupotha.auth.dto;

import lombok.Data;

@Data
public class EstateRegistrationRequest {
    private String name;
    private String code;
    private String address;
    private String phone;
    private String managerName;
    private String adminEmail;
    private String adminPassword;
}
