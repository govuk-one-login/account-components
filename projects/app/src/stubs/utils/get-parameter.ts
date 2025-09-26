import { SSMProvider } from '@aws-lambda-powertools/parameters/ssm';
import {SSMClient, SSMClientConfig} from '@aws-sdk/client-ssm';

const config: SSMClientConfig = {
    region: process.env.AWS_REGION || 'eu-west-2',
    endpoint: process.env.AWS_SSM_ENDPOINT || 'http://localhost:4566',
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.ACCESS_KEY_SECRET || 'test',
    }
}

const ssmClient = new SSMClient(config);
const ssmProvider = new SSMProvider({ awsSdkV3Client: ssmClient });

export const getLocalParameter = async (name: string): Promise<string> => {
    const value = await ssmProvider.get(name);
    if (!value) {
        throw new Error(`SSM parameter ${name} not found`);
    }
    return value;
};


 export const isLocalhost = () => !!process.env.AWS_SSM_ENDPOINT && process.env.AWS_SSM_ENDPOINT?.includes("localhost");