package com.arjunerasani.chat_system.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class LiveKitTokenService {
    @Value("${livekit.api.key}")
    private String apiKey;

    @Value("${livekit.api.secret}")
    private String apiSecret;

    public String generateToken(String roomName, String identity) {
        // livekit requires hmac key
        Key signingKey = Keys.hmacShaKeyFor(apiSecret.getBytes(StandardCharsets.UTF_8));

        // new video grants permission object
        Map<String, Object> videoGrants = new HashMap<>();
        videoGrants.put("roomJoin", true);
        videoGrants.put("room", roomName);
        videoGrants.put("canPublish", true);
        videoGrants.put("canSubscribe", true);

        // standard jwt layout
        return Jwts.builder()
                .setIssuer(apiKey)
                .setSubject(identity)
                .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 2)) // 2 hours
                .claim("video", videoGrants)
                .claim("identity", identity)
                .claim("name", identity)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }
}
