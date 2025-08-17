package data.config;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class SimulationWebSocketHandler extends TextWebSocketHandler {
    private final List<WebSocketSession> sessions = new CopyOnWriteArrayList<>();
    // sessionId -> sockets subscribed
    private final Map<String, List<WebSocketSession>> sessionChannels = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.add(session);
        String sessionId = extractSessionId(session);
        if (sessionId != null) {
            sessionChannels.computeIfAbsent(sessionId, k -> new CopyOnWriteArrayList<>()).add(session);
        }
        System.out.println("WebSocket connection established: ws=" + session.getId() + " simSession=" + sessionId);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session);
        sessionChannels.values().forEach(list -> list.remove(session));
        System.out.println("WebSocket connection closed: ws=" + session.getId());
    }

    private String extractSessionId(WebSocketSession session) {
        var params = session.getUri() != null ? session.getUri().getQuery() : null;
        if (params == null) return null;
        for (String kv : params.split("&")) {
            int idx = kv.indexOf('=');
            if (idx > 0) {
                String key = kv.substring(0, idx);
                String val = kv.substring(idx + 1);
                if (key.equals("sessionId") && !val.isBlank()) return val;
            }
        }
        return null;
    }

    public void sendMessage(String message) {
        TextMessage textMessage = new TextMessage(message);
        for (WebSocketSession session : sessions) {
            try {
                if (session.isOpen()) session.sendMessage(textMessage);
            } catch (Exception ignored) {}
        }
    }

    public void sendMessageToSession(String simulationSessionId, String message) {
        List<WebSocketSession> channel = sessionChannels.get(simulationSessionId);
        if (channel == null) return;
        TextMessage textMessage = new TextMessage(message);
        for (WebSocketSession ws : channel) {
            try { if (ws.isOpen()) ws.sendMessage(textMessage); } catch (Exception ignored) {}
        }
    }
}
