package com.dalupotha.auth.exception;

import com.dalupotha.auth.dto.AuthDtos.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleResponseStatus(ResponseStatusException ex) {
        log.warn("Request error: {} - {}", ex.getStatusCode(), ex.getReason());
        return ResponseEntity.status(ex.getStatusCode())
                .body(new ErrorResponse(
                        ex.getStatusCode().value(),
                        HttpStatus.valueOf(ex.getStatusCode().value()).getReasonPhrase(),
                        ex.getReason()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "Validation Error", message));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableJson(HttpMessageNotReadableException ex) {
        log.warn("Malformed JSON payload: {}", ex.getMostSpecificCause().getMessage());
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "Bad Request", "Malformed JSON request body"));
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(org.springframework.dao.DataIntegrityViolationException ex) {
        String detail = ex.getMostSpecificCause().getMessage();
        String message;

        if (detail == null) {
            message = "A record with this information already exists.";
        } else if (detail.contains("Key (email)")) {
            message = "This email address is already registered. Please use a different admin email.";
        } else if (detail.contains("Key (contact)")) {
            message = "This phone number is already registered. Please use a different contact number.";
        } else if (detail.contains("Key (username)")) {
            message = "This username is already taken. Please use a different admin email.";
        } else if (detail.contains("Key (code)")) {
            message = "This estate code is already in use. Please choose a unique code (e.g. RIV-02).";
        } else if (detail.contains("Key (name)")) {
            message = "An estate with this name already exists. Please use a different estate name.";
        } else if (detail.contains("Key (employee_id)")) {
            message = "This Employee ID is already registered.";
        } else if (detail.contains("Key (nic)")) {
            message = "This NIC number is already registered.";
        } else if (detail.contains("already exists")) {
            message = "A record with this information already exists.";
        } else if (detail.contains("too long")) {
            message = "One of the provided fields is too long.";
        } else {
            message = "A record with this information already exists.";
        }

        log.warn("Data integrity error: {}", detail);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(409, "Conflict", message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        log.error("Unexpected error", ex);
        return ResponseEntity.internalServerError()
                .body(new ErrorResponse(500, "Internal Server Error",
                        "An unexpected error occurred. Please try again."));
    }
}
