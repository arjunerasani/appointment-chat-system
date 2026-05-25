package com.arjunerasani.chat_system.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JWTService {
    private final SecretKey key = Jwts.SIG.HS256.key().build();

    // 8 hour expiration time
    private final long EXPIRATION_TIME = 1000 * 60 * 60 * 8;

    public String generateToken(String email, String name) {
        return Jwts.builder()
                .subject(email)
                .claim("name", name)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(key)
                .compact();
    }
}
