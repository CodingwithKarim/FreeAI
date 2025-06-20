# <h1 align="center">FreeAI</h1>
<p align="center"><em>Run open-source AI models locally — private, offline, and fully in your control. Powered by <a href="https://huggingface.co" target="_blank">Hugging Face</a>.</em></p>

![image](https://github.com/user-attachments/assets/2720491b-88e7-4896-8ce7-354d7a2dca01)

FreeAI is a powerful and user friendly AI control center for running AI models entirely on your own computer hardware. No subscriptions. No API keys. No internet required. 

Unlike most AI tools that lock features behind paywalls or require cloud access and user accounts, FreeAI puts you in full control to download models from Hugging Face directly to your local computer, run them in 4-bit, 8-bit, or full precision, and interact with them seamlessly while keeping your data private and your wallet untouched. 

Whether you’re chatting, generating text, or testing LLMs locally, FreeAI makes it effortless. 

---

## Table of Contents

* [Features](#features)
* [Getting Started](#getting-started)
* [Usage](#usage)
* [Tech Stack](#tech-stack)
* [Advanced Options](#advanced-options)
* [Architecture Overview](#architecture-overview)
* [License](#license)

---

## Features

🔹 **Model Search & Download**
Search and Download Hugging Face AI models directly from Model registry control. Filter by downloads, likes, trending. Sort by quantized or uncensored models.

🔹 **Flexible Chat Modes**
Switch between Ask (Q\&A), Chat (conversational), and Text Complete (open-ended text generation).

🔹 **Session Management**
Create, delete, and manage isolated chat sessions with own session context. 

🔹 **Precision Selection**
Choose between 4-bit, 8-bit, or full precision when loading model into memory.

🔹 **Offline-Only Inference**
No API keys or cloud access required. All processing happens on your machine.

🔹 **Context Control**
Toggle between shared vs. isolated model memory. Clear context on demand.

---

## Getting Started

While running FreeAI, you’ll only need an internet connection for searching and downloading models. All other features like loading models and generating responses work fully offline, as the app uses your local hardware to run AI inference. You can turn off WIFI if paranoid and app will work fine. 

A dedicated GPU is highly recommended. While CPU-only mode is supported, performance is significantly slower and can place heavy stress on your computer, since CPUs and RAM are not optimized for AI workloads. NVIDIA GPUs with CUDA offer the best compatibility and performance with the Transformers library and therefore FreeAI. AMD ROCm and Apple Silicon GPUs are also supported, but results may vary depending on the specific chip. (Only NVIDIA CUDA GPUs support loading models in 4-bit or 8-bit formats & offloading to CPU & GPU together.)

For best + optimal performance, model weights should be loaded entirely into your GPU’s virtual memory. The more VRAM your GPU has, the better and allows you to safely load and run larger AI models. A minimum of 1–2 GB of VRAM is required, though 6 GB or more is strongly recommended. Emphasis on the more VRAM your GPU has, the better. 

Powerful 7B parameter models can typically fit entirely in 6–8 GB of VRAM when quantized. Quantization can be performed on NVIDIA CUDA GPUs to convert standard 32-bit float weights into 8-bit or 4-bit formats, reducing memory usage by up to 4× and significantly boosting performance. This is why a CUDA-compatible NVIDIA GPU is strongly recommended since it dramatically lowers the hardware cost of running AI models. CPU only mode will reveal that running inference is expensive (you can hear my laptop's fan a town over when using CPU only mode).

### Prerequisites

* Python
* Node.js + npm
* Pip
* Git (recommended to pull code + future updates but can also directly download ZIP from GitHub repository)
* PyTorch (get CUDA equivalent version here if applicable: https://pytorch.org/get-started/locally/)

### Installation

```bash
git clone https://github.com/CodingWithKarim/freeai.git
```

#### Backend

```bash
# Where you downloaded the project, navigate to root project directory
cd C:\Code\freeai

# Create a virtual environment in Python (keep project dependencies isolated in your system)
# Best to create virtual environment in root project directory eg: FreeAI/venv
python -m venv venv

# Activate virtual environment (google or ask ChatGPT if need help or stuck)
# For linux + mac I think
source venv/bin/activate

# Windows:
.\venv\Scripts\activate or venv\Scripts\activate

# Navigate to backend directory
cd backend

# Using pip, install project dependency modules defined in backend/requirments.txt
pip install -r requirements.txt

# Using Uvicorn, run the server
# The first time you run the server after a while it may take a few seconds
uvicorn app.main:app
```

#### Frontend

```bash
# From root projct directory, navigate to FreeAI/frontend folder
cd ../frontend

# Install project front end dependencies 
npm install

# Run the local Vite server
npm run dev
```

Then visit http://localhost:5173. Run the backend server first then the frontend second. 

---

## Usage

1. **Create a new chat session** → Name it and manage it independently
2. **Browse models** →  Search Hugging Face and apply filters. (Pressing Enter with no input will return the most popular models based on your selected filters.)
3. **Download models** → Download the model repository from Hugging Face directly to your local machine and assign it a custom name. They will be stored under FreeAI/backend/hugging_face_models
4. **Load a model** → Load the model into system memory and select a quantization mode (4-bit, 8-bit, or full precision). Quantization is only available on NVIDIA CUDA GPUs.
5. **Select a chat mode** → Choose between Ask, Chat, or Complete mode.

     *Ask Mode: One-off Q&A, great for quick questions

     *Chat Mode: Multi-turn conversations with persistent context/history

     *Complete Mode: Open-ended text generation based on input

6. **Toggle context sharing** → Choose whether to share memory across models or isolate it per model. Helpful for model comparisons or multi-model conversations.
7. **Send messages and view replies** → All inference is performed locally using your hardware.
8. **Data Persistence** →  All sessions, messages, and models data is stored in a local SQLite database in project backend directory. Database is located at FreeAI/backend/data and is created once server is successfully started. 

---

## Tech Stack

**Frontend**

- **React** – Handles all UI logic, including model browsing, session management, chat interaction, and toggle options.
- **Vite** – Frontend development server
- **Tailwind CSS** – CSS framework for building clean, responsive interfaces without writing custom CSS.  

**Backend**

- **Uvicorn** – Python server that runs the FastAPI web framework with support for asynchronous operations, concurrency and request handling.
- **FastAPI** – High-performance Python web framework used for building RESTful APIs. Powers model search, download, inference, and request/response interaction.  
- **SQLite** – Lightweight, file-based database that stores session metadata, chat history, and model info. Requires zero setup and fits the local/offline design goal since data is stored directly to disk without remote storage.  
- **In-Memory Caching** – Inference results and session/model data are cached in memory for fast read / write operations. Writes to the SQLite database happen asynchronously in the background to avoid blocking the main thread and allow the application to be more responsive / efficient.

**Inference & Model Handling**

- **Hugging Face Hub Client** – Used to query / search for AI models as well as download those models directly to local computer. 
- **Hugging Face Transformers Library** – Core inference / text-generation library used to load and run language models from local model files.   
- **bitsandbytes** – Library that enables 4-bit and 8-bit quantized model loading, reducing VRAM usage and allowing large models to run on consumer-grade GPUs. (Requires an NVDIA CUDA GPU) 
- **PyTorch** – Underlying framework used by Transformers for AI model execution/interaction. 

---

## Advanced Options

### Context Sharing

* **ON**: Messages are shared across models within the same session.
* **OFF**: Each model only sees its own messages, isolating conversations.

### Token Limit

* Sets the maximum number of output tokens per response.
* Higher values allow longer responses but increase the risk of rambling or hallucination, especially with smaller models.

### Model Metadata

Hugging Face’s API does not expose model size directly. However, we extract it by inspecting the repository metadata:  
* The siblings property lists all files in the model’s repo and their metadata, including their sizes.
* We add up the total sizes of all .bin and .safetensors files to estimate model size and present to user.
* This protects users from accidentally downloading massive models (e.g., 500+ GB) that could overwhelm their system. Without this, it's very easy to queue up several terabytes of model downloads while browsing freely. 

---

## Architecture Overview

                             ┌────────────────────────────┐
                             │   React UI (Vite Server)   │
                             └──────────┬─────────────────┘
                                        ▲
                                        │
                             ┌──────────┴──────────┐
                             │ Uvicorn / FastAPI   │
                             │      Backend        │
                             └───────┬────▲────────┘────┬────▲──────────────────────┬───▲───
                                     │    │             │    │                      │   │   
                                     ▼    │             ▼    │                      ▼   │   
          ┌────────────────────────────────────┐      ┌──────────────────────┐      ┌────────────────────────┐
          │      Hugging Face Transformers     │      │   SQLite Database    |      │    In-Memory Cache     |
          │      (Inference & Model Loading)   │      │   (Sessions & Cache) │      └────────────────────────┘
          └──────────────▲─────────────────────┘      └──────────────────────┘
                         │                                 
                         ▼                                 
         ┌────────────────────────┐         
         │  Local Model Files     │         
         │ (.bin / .safetensors)  │         
         └────────────┬───────────┘
                      ▼
        ┌──────────────────────────────────┐
        │ Quantized Model Handling (CUDA / │
        │ CPU via bitsandbytes & PyTorch)  │
        └──────────────────────────────────┘



---

## License
This project is licensed under the **MIT License**. See [here](https://mit-license.org/) for details.
