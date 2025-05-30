import torch

def get_user_hardware_profile():
    profile = {
        "cuda_available": torch.cuda.is_available(),
        "vram_gb": 0,
        "tier": "low"
    }

    if profile["cuda_available"]:
        try:
            device = torch.device("cuda:0")
            vram_bytes = torch.cuda.get_device_properties(device).total_memory
            vram_gb = round(vram_bytes / (1024 ** 3), 2)
            profile["vram_gb"] = vram_gb

            if vram_gb >= 12:
                profile["tier"] = "high"
            else:
                profile["tier"] = "medium"
        except Exception:
            profile["tier"] = "low"
        
        print(profile)

    return profile