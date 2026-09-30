import { Config } from '@remotion/cli/config';
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// Le shader « toxine » a besoin de WebGL : sur ce serveur sans GPU, seul le
// backend ANGLE le rend (swiftshader sort une frame noire).
Config.setChromiumOpenGlRenderer('angle');
