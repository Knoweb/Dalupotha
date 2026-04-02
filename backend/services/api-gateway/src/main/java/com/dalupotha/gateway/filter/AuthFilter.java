package com.dalupotha.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * JWT Authentication Filter applied to all protected routes.
 * Validates the Bearer token and forwards userId/role headers to downstream services.
 */
@Component
public class AuthFilter extends AbstractGatewayFilterFactory<AuthFilter.Config> {

    @Value("${jwt.secret:dalupotha-super-secret-jwt-key-change-in-production-2024}")
    private String jwtSecret;

    public AuthFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return unauthorized(exchange, "Missing or invalid Authorization header");
            }

            String token = authHeader.substring(7);
            try {
                Claims claims = parseToken(token);

                // Forward identity headers to downstream services
                ServerWebExchange mutatedExchange = exchange.mutate()
                        .request(r -> r
                                .header("X-User-Id",   claims.getSubject())
                                .header("X-User-Role", claims.get("role", String.class))
                                .header("X-User-Name", claims.get("fullName", String.class))
                        )
                        .build();

                return chain.filter(mutatedExchange);

            } catch (JwtException | IllegalArgumentException e) {
                return unauthorized(exchange, "Invalid or expired token");
            }
        };
    }

    private Claims parseToken(String token) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String reason) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().add("X-Auth-Error", reason);
        return exchange.getResponse().setComplete();
    }

    public static class Config {
        // No config fields needed for now
    }
}
