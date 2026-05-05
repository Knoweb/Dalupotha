package com.dalupotha.auth.scratch;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class DbInspector implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        log.info("--- DATABASE INSPECTION START ---");
        try {
            List<Map<String, Object>> constraints = jdbcTemplate.queryForList(
                "SELECT conname, conrelid::regclass as table_name, confrelid::regclass as ref_table " +
                "FROM pg_constraint " +
                "WHERE confrelid = 'users'::regclass OR confrelid = 'small_holders'::regclass"
            );
            
            for (Map<String, Object> con : constraints) {
                log.info("Constraint: {} | Table: {} | References: {}", 
                    con.get("conname"), con.get("table_name"), con.get("ref_table"));
            }
        } catch (Exception e) {
            log.error("Failed to inspect DB: {}", e.getMessage());
        }
        log.info("--- DATABASE INSPECTION END ---");
    }
}
