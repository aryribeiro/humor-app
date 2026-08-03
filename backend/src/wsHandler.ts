import { Socket } from "socket.io";
import { SessionManager } from "./sessionManager";
import { BedrockVoiceClient } from "./bedrockClient";
import { Locale } from "./types";

export function handleSocketConnection(
  socket: Socket,
  sessionManager: SessionManager,
  bedrockClient: BedrockVoiceClient
): void {
  const session = sessionManager.createSession();
  const { sessionId } = session;

  console.log(`[IO] Client connected: ${sessionId} (socket: ${socket.id})`);

  socket.emit("session_created", { sessionId, state: session });

  let switchingVoice = false;

  socket.on("set_language", async (data: { locale: Locale }) => {
    const updated = sessionManager.updateSession(sessionId, { locale: data.locale });
    if (!updated) return;

    socket.emit("language_changed", { locale: updated.locale, voiceId: updated.voiceId });

    if (bedrockClient.isSessionActive(sessionId) && !switchingVoice) {
      switchingVoice = true;
      try {
        await bedrockClient.switchVoice(sessionId, updated.locale, updated.voiceId);
      } catch (err) {
        console.error(`[IO] Error switching voice for ${sessionId}:`, err);
        socket.emit("error_msg", { message: "Voice switch failed" });
      } finally {
        switchingVoice = false;
      }
    }

    console.log(`[IO] ${sessionId} language changed to ${updated.locale} (${updated.voiceId})`);
  });

  socket.on("ping_msg", () => {
    socket.emit("pong_msg");
  });

  socket.on("start_listening", () => {
    listeningStoppedEmitted = false;
    sessionManager.updateSession(sessionId, { isListening: true });

    const currentSession = sessionManager.getSession(sessionId);
    if (!currentSession) return;

    bedrockClient
      .startSession(sessionId, {
        voiceId: currentSession.voiceId,
        locale: currentSession.locale,
        onAudioChunk: (base64Audio) => {
          socket.emit("audio_output", { data: base64Audio });
        },
        onInterrupted: () => {
          socket.emit("interrupted");
        },
        onStopRequested: () => {
          socket.emit("stop_requested");
          sessionManager.updateSession(sessionId, { isListening: false });
          bedrockClient.endSession(sessionId).catch((err) => {
            console.error(`[IO] Error ending session after stop request for ${sessionId}:`, err);
          });
          if (!listeningStoppedEmitted) {
            listeningStoppedEmitted = true;
            socket.emit("listening_stopped");
          }
        },
        onNavigationCommand: async (locale: Locale) => {
          if (switchingVoice) return;
          const updated = sessionManager.updateSession(sessionId, { locale });
          if (updated) {
            socket.emit("navigation_command", { locale });
            socket.emit("language_changed", { locale: updated.locale, voiceId: updated.voiceId });
            switchingVoice = true;
            try {
              await bedrockClient.switchVoice(sessionId, updated.locale, updated.voiceId);
            } catch (err) {
              console.error(`[IO] Error switching voice via nav for ${sessionId}:`, err);
              socket.emit("error_msg", { message: "Voice switch failed" });
            } finally {
              switchingVoice = false;
            }
          }
        },
        onError: (error) => {
          socket.emit("error_msg", { message: "Voice session error", details: error.message });
        },
        onStreamComplete: () => {
          sessionManager.updateSession(sessionId, { isListening: false });
          if (!listeningStoppedEmitted) {
            listeningStoppedEmitted = true;
            socket.emit("listening_stopped");
          }
        },
      })
      .then(() => {
        socket.emit("listening_started");
        console.log(`[IO] ${sessionId} started listening`);
      })
      .catch((err) => {
        socket.emit("error_msg", {
          message: "Failed to start voice session",
          details: err instanceof Error ? err.message : String(err),
        });
      });
  });

  let listeningStoppedEmitted = false;

  socket.on("stop_listening", () => {
    sessionManager.updateSession(sessionId, { isListening: false });
    bedrockClient.endSession(sessionId).catch((err) => {
      console.error(`[IO] Error ending session for ${sessionId}:`, err);
    });
    if (!listeningStoppedEmitted) {
      listeningStoppedEmitted = true;
      socket.emit("listening_stopped");
    }
    console.log(`[IO] ${sessionId} stopped listening`);
  });

  socket.on("audio_chunk", (data: { data: string }) => {
    if (bedrockClient.isSessionActive(sessionId)) {
      bedrockClient.sendAudioChunk(sessionId, data.data).catch((err) => {
        console.error(`[IO] Error sending audio chunk for ${sessionId}:`, err);
      });
    }
  });


  socket.on("disconnect", () => {
    if (bedrockClient.isSessionActive(sessionId)) {
      bedrockClient.endSession(sessionId).catch(() => {
        bedrockClient.forceCloseSession(sessionId);
      });
    }
    sessionManager.deleteSession(sessionId);
    console.log(`[IO] Client disconnected: ${sessionId}`);
  });
}
