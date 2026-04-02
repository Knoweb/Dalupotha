package com.dalupotha.auth.security;

import com.dalupotha.auth.entity.User;
import com.dalupotha.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String employeeId) throws UsernameNotFoundException {
        User user = userRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + employeeId));

        return new org.springframework.security.core.userdetails.User(
                user.getEmployeeId(),
                user.getHashedPassword() != null ? user.getHashedPassword() : "",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
