/**
 * @meeting-transcriber/audio-processor
 *
 * Audio processing utilities for browser-based audio capture, chunking, and encoding
 * optimized for Whisper API transcription.
 */

export { AudioChunker, type ChunkerOptions } from './chunker';
export { WavEncoder } from './encoder';
export { VoiceActivityDetector, type VADOptions } from './vad';
