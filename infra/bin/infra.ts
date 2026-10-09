#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NikasiStack } from '../lib/nikasi-stack';

const app = new cdk.App();
new NikasiStack(app, 'Nikasi', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
});
