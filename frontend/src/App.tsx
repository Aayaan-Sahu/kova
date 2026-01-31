import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface TranscriptSegment {
  speaker: 'user' | 'caller';
  text: string;
}

interface TranscriptMessage {
  type: string;
  segments: TranscriptSegment[];
}

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Refs to keep track of the socket and audio context
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get available audio input devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        console.error('Microphone permission denied');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .filter(device => !device.label.toLowerCase().includes('virtual'))
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
        }));

      setAudioDevices(audioInputs);

      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    };

    getDevices();
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const wsUrl = `ws://localhost:8000/ws/audio?sample_rate=${audioContext.sampleRate}`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('WebSocket Connected');
        setIsListening(true);

        processor.onaudioprocess = (e) => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16Data = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            socketRef.current.send(int16Data.buffer);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      // Handle incoming transcripts with speaker info
      socketRef.current.onmessage = (event) => {
        try {
          const message: TranscriptMessage = JSON.parse(event.data);
          console.log('Received:', message);

          if (message.type === 'transcript' && message.segments.length > 0) {
            setTranscriptSegments(prev => [...prev, ...message.segments]);
          }
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };

      socketRef.current.onclose = () => console.log('WebSocket Closed');

    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }, [selectedDeviceId]);

  const stopListening = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setIsListening(false);
  }, []);

  const clearTranscript = () => {
    setTranscriptSegments([]);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '20px' }}>📞 Kova - Scam Call Detector</h1>

      {/* Microphone selector */}
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="mic-select" style={{ marginRight: '10px' }}>Microphone: </label>
        <select
          id="mic-select"
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
          disabled={isListening}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          {audioDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={isListening ? stopListening : startListening}
          style={{
            padding: '12px 24px',
            backgroundColor: isListening ? '#EF4444' : '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {isListening ? '⏹ Stop Listening' : '🎤 Start Listening'}
        </button>
        <button
          onClick={clearTranscript}
          style={{
            padding: '12px 24px',
            backgroundColor: '#6B7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Clear
        </button>
      </div>

      {/* Speaker legend */}
      <div style={{ marginBottom: '15px', display: 'flex', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            backgroundColor: '#3B82F6',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>USER</span>
          <span style={{ color: '#666' }}>You (the person on speakerphone)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            backgroundColor: '#F59E0B',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>CALLER</span>
          <span style={{ color: '#666' }}>The person calling you</span>
        </div>
      </div>

      {/* Transcript display */}
      <div style={{
        border: '1px solid #e5e7eb',
        padding: '20px',
        minHeight: '300px',
        borderRadius: '8px',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ lineHeight: '2' }}>
          {transcriptSegments.map((segment, index) => (
            <div key={index} style={{ marginBottom: '8px' }}>
              <span style={{
                backgroundColor: segment.speaker === 'user' ? '#3B82F6' : '#F59E0B',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                marginRight: '10px'
              }}>
                {segment.speaker.toUpperCase()}
              </span>
              <span style={{ color: '#1f2937' }}>{segment.text}</span>
            </div>
          ))}
          {transcriptSegments.length === 0 && (
            <div style={{ color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', marginTop: '100px' }}>
              🎙️ Put your phone on speakerphone and start listening...<br />
              The conversation will appear here with labeled speakers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;