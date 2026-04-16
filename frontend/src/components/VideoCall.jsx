import { useEffect, useRef, useState, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { videoService } from '../services/common/video.service';

function RemoteVideo({ uid, videoTrack }) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!videoTrack || !containerRef.current) return;
    videoTrack.play(containerRef.current);
    return () => videoTrack.stop();
  }, [videoTrack]);
  return <div ref={containerRef} className="absolute inset-0 w-full h-full bg-gray-900" />;
}

export default function VideoCall({ channelName, role = 'publisher', onLeave }) {
  const clientRef = useRef(null);
  const localTracksRef = useRef({ audio: null, video: null });
  const activeRef = useRef(false);
  const joinAttemptRef = useRef(0);

  const [remoteUsers, setRemoteUsers] = useState({});
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  // settings panel state
  const [showSettings, setShowSettings] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [mics, setMics] = useState([]);
  const [activeCamId, setActiveCamId] = useState('');
  const [activeMicId, setActiveMicId] = useState('');
  const [switching, setSwitching] = useState(false);

  // internal cleanup
  const cleanup = useCallback(async () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    joinAttemptRef.current += 1;
    const { audio, video } = localTracksRef.current;
    audio?.close();
    video?.close();
    localTracksRef.current = { audio: null, video: null };
    try { await clientRef.current?.leave(); } catch (_) {}
    clientRef.current = null;
  }, []);

  // load available devices
  const loadDevices = useCallback(async () => {
    try {
      const [camList, micList] = await Promise.all([
        AgoraRTC.getCameras(),
        AgoraRTC.getMicrophones(),
      ]);
      setCameras(camList);
      setMics(micList);
    } catch (_) {}
  }, []);

  // join channel
  const join = useCallback(async () => {
    const attemptId = joinAttemptRef.current;
    try {
      const { appId, token, uid } = await videoService.fetchToken(channelName, role);
      if (attemptId !== joinAttemptRef.current || !activeRef.current) return;

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video') {
          setRemoteUsers((prev) => ({ ...prev, [user.uid]: { ...prev[user.uid], videoTrack: user.videoTrack } }));
        }
        if (mediaType === 'audio') {
          user.audioTrack?.play();
          setRemoteUsers((prev) => ({ ...prev, [user.uid]: { ...prev[user.uid], audioTrack: user.audioTrack } }));
        }
      });
      client.on('user-unpublished', (user, mediaType) => {
        setRemoteUsers((prev) => {
          const entry = prev[user.uid];
          if (!entry) return prev;
          return { ...prev, [user.uid]: { ...entry, [mediaType === 'video' ? 'videoTrack' : 'audioTrack']: null } };
        });
      });
      client.on('user-left', (user) => {
        setRemoteUsers((prev) => { const n = { ...prev }; delete n[user.uid]; return n; });
      });

      await client.join(appId, channelName, token, uid);
      if (attemptId !== joinAttemptRef.current || !activeRef.current) { await client.leave(); return; }

      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      if (attemptId !== joinAttemptRef.current || !activeRef.current) {
        audioTrack.close(); videoTrack.close(); await client.leave(); return;
      }

      localTracksRef.current = { audio: audioTrack, video: videoTrack };
      videoTrack.play('local-video');
      await client.publish([audioTrack, videoTrack]);

      // Capture active device IDs
      setActiveCamId(videoTrack.getTrackLabel());
      setActiveMicId(audioTrack.getTrackLabel());
      await loadDevices();

      setJoined(true);
    } catch (err) {
      if (attemptId === joinAttemptRef.current && activeRef.current) {
        setError(err.message || 'Failed to join call');
      }
    }
  }, [channelName, role, loadDevices]);

  // leave
  const leave = useCallback(async () => {
    await cleanup();
    setJoined(false);
    setRemoteUsers({});
    onLeave?.();
  }, [cleanup, onLeave]);

  // mic toggle
  const toggleMic = useCallback(async () => {
    const { audio } = localTracksRef.current;
    if (!audio) return;
    await audio.setMuted(!micMuted);
    setMicMuted((prev) => !prev);
  }, [micMuted]);

  // camera toggle
  const toggleCam = useCallback(async () => {
    const { video } = localTracksRef.current;
    if (!video) return;
    await video.setMuted(!camOff);
    setCamOff((prev) => !prev);
  }, [camOff]);

  // switch camera device
  const switchCamera = useCallback(async (deviceId) => {
    const { video } = localTracksRef.current;
    if (!video || switching) return;
    setSwitching(true);
    try {
      await video.setDevice(deviceId);
      setActiveCamId(deviceId);
    } catch (_) {}
    setSwitching(false);
  }, [switching]);

  // switch microphone device
  const switchMic = useCallback(async (deviceId) => {
    const { audio } = localTracksRef.current;
    if (!audio || switching) return;
    setSwitching(true);
    try {
      await audio.setDevice(deviceId);
      setActiveMicId(deviceId);
    } catch (_) {}
    setSwitching(false);
  }, [switching]);

  useEffect(() => {
    activeRef.current = true;
    joinAttemptRef.current += 1;
    join();
    return () => { cleanup(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-950">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  const remoteEntries = Object.entries(remoteUsers);
  const hasRemote = remoteEntries.length > 0;

  return (
    <div className="fixed inset-0 z-[1000] bg-gray-950 overflow-hidden flex flex-col">

      {/* ── Main video area ── */}
      <div className="flex-1 relative overflow-hidden">
        {hasRemote ? (
          remoteEntries.map(([uid, { videoTrack }]) => (
            <RemoteVideo key={uid} uid={uid} videoTrack={videoTrack} />
          ))
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-950">
            <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center animate-pulse">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm font-medium">Waiting for the other participant…</p>
          </div>
        )}

        {/* Local PiP */}
        <div className="absolute bottom-4 right-4 w-44 aspect-video rounded-xl overflow-hidden border-2 border-gray-700 shadow-2xl bg-gray-800 z-10">
          <div id="local-video" className="w-full h-full" />
          <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
            {micMuted && <span className="bg-red-600/90 text-white text-[10px] px-1.5 py-0.5 rounded-full">Muted</span>}
            {camOff && <span className="bg-red-600/90 text-white text-[10px] px-1.5 py-0.5 rounded-full">Cam off</span>}
            {!micMuted && !camOff && <span className="text-white/60 text-[10px]">You</span>}
          </div>
        </div>

        {/* Settings panel — slides in from right */}
        {showSettings && (
          <div className="absolute top-4 right-4 w-72 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-2xl shadow-2xl z-20 p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Device Settings</span>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Camera selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                Camera
              </label>
              <select
                value={activeCamId}
                onChange={(e) => switchCamera(e.target.value)}
                disabled={switching || camOff}
                className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>{cam.label || `Camera ${cam.deviceId.slice(0, 6)}`}</option>
                ))}
              </select>
            </div>

            {/* Microphone selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-400 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
                Microphone
              </label>
              <select
                value={activeMicId}
                onChange={(e) => switchMic(e.target.value)}
                disabled={switching || micMuted}
                className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mics.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>{mic.label || `Microphone ${mic.deviceId.slice(0, 6)}`}</option>
                ))}
              </select>
            </div>

            {switching && <p className="text-blue-400 text-xs text-center">Switching device…</p>}
          </div>
        )}
      </div>

      {/* ── Control bar ── */}
      <div className="flex items-center justify-center gap-3 py-4 px-6 bg-gray-900/95 backdrop-blur border-t border-gray-800">

        {/* Mic */}
        <button onClick={toggleMic} title={micMuted ? 'Unmute' : 'Mute'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${micMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}>
          {micMuted ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          )}
        </button>

        {/* Camera */}
        <button onClick={toggleCam} title={camOff ? 'Show Camera' : 'Hide Camera'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${camOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}>
          {camOff ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          )}
        </button>

        {/* Settings */}
        <button onClick={() => { setShowSettings((p) => !p); loadDevices(); }} title="Device Settings"
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${showSettings ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}>
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>

        {/* Leave */}
        <button onClick={leave} title="Leave Call"
          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors">
          <svg className="w-5 h-5 text-white rotate-[135deg]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
