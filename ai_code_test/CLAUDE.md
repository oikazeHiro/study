# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
# Build and run tests
./mvnw verify

# Run without tests
./mvnw spring-boot:run

# Run a single test class
./mvnw test -Dtest=AiCodeTestApplicationTests

# Run a single test method
./mvnw test -Dtest=AiCodeTestApplicationTests#imageTest
```

## Architecture

Spring Boot 3.5 web app (Java 21) that wraps LangChain4j with a local Ollama model for chat and image analysis.

- **`AiCodeHelper`** — single `@Service` that injects the auto-configured `ChatModel` (via `langchain4j-ollama-spring-boot-starter`). Its `chat(UserMessage)` method sends a message to Ollama and returns the AI response text.
- **Model layer** — `ModelBasisData` (3D model metadata with position/scale/rotation), `TernaryNumber` (x/y/z triple), `ModelStatus` enum (NORMAL/DELETED/HIDDEN). These are data classes only; no persistence or controllers wired to them yet.

The Ollama base URL and model name are configured in `application.yml` under `langchain4j.ollama.chat-model`. The app currently uses `qwen3-vl:4b` — a vision-capable model, which is why the test sends both `TextContent` and `ImageContent` in a `UserMessage`.