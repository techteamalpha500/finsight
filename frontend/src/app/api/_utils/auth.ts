import type { NextRequest } from "next/server";
import { CognitoJwtVerifier } from "aws-jwt-verify";

let idVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return (typeof v === "string" && v.trim().length > 0) ? v.trim() : undefined;
}

export async function getUserSubFromJwt(req: NextRequest): Promise<string | null> {
  const poolId = getEnv("COGNITO_USER_POOL_ID");
  const region = getEnv("AWS_REGION") || "us-east-1";
  const audienceCsv = getEnv("COGNITO_AUDIENCE");
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = auth && auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : undefined;

  // If no configuration, allow dev mode and treat as a demo user
  if (!poolId || !token) {
    return process.env.NODE_ENV === "production" ? null : "dev-user";
  }

  const audiences = (audienceCsv || "").split(",").map(s => s.trim()).filter(Boolean);
  const clientId = audiences[0];
  try {
    if (!idVerifier) {
      idVerifier = CognitoJwtVerifier.create({
        userPoolId: poolId,
        tokenUse: "id",
        clientId,
      } as any);
    }
    const payload = await (idVerifier as any).verify(token);
    const sub = String((payload as any).sub || "");
    return sub || null;
  } catch {
    return null;
  }
}

