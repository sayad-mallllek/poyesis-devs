import { Injectable } from "@nestjs/common";
import argon2 from "argon2";

/** OWASP-recommended argon2id parameters (m=19 MiB, t=2, p=1). */
const HASH_OPTIONS = { type: argon2.argon2id as 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

@Injectable()
export class PasswordService {
  /** Used to spend comparable time when the account does not exist. */
  private readonly dummyHash = argon2.hash("timing-equalizer-password", HASH_OPTIONS);

  hash(password: string): Promise<string> {
    return argon2.hash(password, HASH_OPTIONS);
  }

  async verify(hash: string | null, password: string): Promise<boolean> {
    if (!hash) {
      await argon2.verify(await this.dummyHash, password).catch(() => false);
      return false;
    }
    return argon2.verify(hash, password).catch(() => false);
  }
}
