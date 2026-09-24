import { Global, Module } from "@nestjs/common";
import { EncryptionService } from "./encryption.service.js";
import { PasswordService } from "./password.service.js";

@Global()
@Module({ providers: [PasswordService, EncryptionService], exports: [PasswordService, EncryptionService] })
export class SecurityModule {}
