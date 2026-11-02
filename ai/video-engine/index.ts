import { compileScene } from '@/ai/prompt-engine';
import { editContext, planEdit } from '@/ai/edit-engine';
import { sceneSchema } from '@/features/scenes/schema';
import { shotSchema } from '@/features/videos/schema';
export function compileStoryboard(snapshot: unknown, scene: unknown, input: unknown[]) {
  const choices = sceneSchema.parse(scene);
  const base = compileScene(snapshot, { ...choices, generationType: 'video' });
  const shots = input.map((s) => shotSchema.parse(s));
  const conflicts = shots.flatMap((s, i) => {
    const result = planEdit(
      snapshot,
      [
        s.subject,
        s.action,
        s.expression,
        s.environment,
        s.performance.mouthMovement,
        s.performance.smileTransition,
      ].join('. '),
    );
    return result.status === 'conflict' ? [`Shot ${i + 1}: ${result.message}`] : [];
  });
  return {
    rulesVersion: 1,
    ready: base.ready && conflicts.length === 0,
    findings: base.findings,
    conflicts,
    preservation: base.ready ? editContext(snapshot) : null,
    positive: base.positive,
    negative: `${base.negative}; facial identity drift; flickering signature features; temporal anatomical distortion; disconnected eye-mouth motion; mouth warping`,
    shots: shots.map((s, index) => ({
      ...s,
      shotNumber: index + 1,
      positive: `${base.positive}\nSHOT ${index + 1}: ${s.duration}s; ${s.camera}; ${s.framing}; subject: ${s.subject}; action: ${s.action}; expression: ${s.expression}; environment: ${s.environment}; camera movement: ${s.cameraMovement}; transition: ${s.transition}.\nFACIAL PERFORMANCE PLANNING ONLY: ${JSON.stringify(s.performance)}\nAudio notes: ${s.audio}; dialogue notes: ${s.dialogue}. Preserve canonical DNA and signature imperfections.`,
    })),
  };
}
