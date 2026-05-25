package com.arjunerasani.chat_system.config;

import com.arjunerasani.chat_system.entity.Staff;
import com.arjunerasani.chat_system.entity.Status;
import com.arjunerasani.chat_system.repository.StaffRepository;
import com.arjunerasani.chat_system.service.JWTService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final JWTService jwtService;
    private final StaffRepository staffRepository;

    public OAuth2SuccessHandler(JWTService jwtService, StaffRepository staffRepository) {
        this.jwtService = jwtService;
        this.staffRepository = staffRepository;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        // look up staff member
        Staff staff = staffRepository.findByEmail(email);

        if (staff == null) {
            staff = new Staff();
            staff.setEmail(email);
            staff.setName(name);
            staff.setStatus(Status.ACTIVE);
        }

        // update last seen
        staff.setLastSeenAt(LocalDateTime.now());
        staffRepository.save(staff);

        // generate our custom jwt
        String token = jwtService.generateToken(email, name);

        // redirect to the react dashboard with the token inside a query parameter
        String targetUrl = "http://localhost:5173/staff-dashboard?token=" + token;
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
