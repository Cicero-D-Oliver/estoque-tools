package com.equipe.estoque.security;

import org.springframework.stereotype.Component;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

@Component
public class OpaqueTokenService {

    private static final int TOKEN_BYTES = 32;
    private final SecureRandom secureRandom = new SecureRandom();

    public TokenMaterial issue() {
        byte[] value = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(value);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(value);
        return new TokenMaterial(raw, hash(raw));
    }

    public String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 não está disponível", exception);
        }
    }

    public record TokenMaterial(String raw, String hash) {
    }
}
