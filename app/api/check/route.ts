import { runLaviniaEngine } from '@/lib/engine/lavinia';

export async function GET() {
  const result = await runLaviniaEngine({
    test: true
  });

  return Response.json(result);
}