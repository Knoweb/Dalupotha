package com.dalupotha.inventory.controller;

import com.dalupotha.inventory.entity.InventoryItem;
import com.dalupotha.inventory.repository.InventoryRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryRepository inventoryRepository;

    public InventoryController(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    @GetMapping
    public List<InventoryItem> getAllItems() {
        return inventoryRepository.findAll();
    }

    @GetMapping("/{itemId}")
    public InventoryItem getItem(@PathVariable UUID itemId) {
        return inventoryRepository.findById(itemId).orElse(null);
    }

    @PostMapping
    public InventoryItem createItem(@RequestBody InventoryItem item) {
        return inventoryRepository.save(item);
    }

    @PutMapping("/{itemId}")
    public InventoryItem updateItem(@PathVariable UUID itemId, @RequestBody InventoryItem item) {
        item.setItemId(itemId);
        return inventoryRepository.save(item);
    }
}
