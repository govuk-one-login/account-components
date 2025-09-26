import {importSPKI, exportJWK} from 'jose';
import logger from "./logger.js";
import {JwksKeyType} from "../types/common.js";


export async function convertPemToJwk(pem, signatureType, keyType: JwksKeyType) {
    try {
        const cleanPem = pem.trim();
        const publicKey = await importSPKI(cleanPem, keyType.alg);

        const jwk = await exportJWK(publicKey);
        jwk.kid = keyType.kid;
        logger.info(`JWK Key is: ${JSON.stringify(jwk, null, 2)}`);
        return jwk;
    } catch (err) {
        console.error('Error converting PEM to JWK:', err);
    }
}