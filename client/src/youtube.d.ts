/// <reference types="youtube" />

// Extend YT.PlayerVars to include `origin` which is valid but missing from @types/youtube
declare namespace YT {
  interface PlayerVars {
    origin?: string;
    enablejsapi?: number;
    playsinline?: number;
  }
}
