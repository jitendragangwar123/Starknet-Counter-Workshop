import { Account, json, RpcProvider } from "starknet";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

async function main(contract_name: string) {
  try {
    // Ensure required environment variables are set
    const rpcEndpoint = process.env.RPC_ENDPOINT;
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    const accountAddress = process.env.DEPLOYER_ADDRESS;

    if (!rpcEndpoint || !privateKey || !accountAddress) {
      throw new Error(
        "Missing required environment variables: RPC_ENDPOINT, DEPLOYER_PRIVATE_KEY, or DEPLOYER_ADDRESS"
      );
    }

    // Initialize provider and account
    const provider = new RpcProvider({
      nodeUrl: `https://starknet-sepolia.g.alchemy.com/v2/${rpcEndpoint}`,
    });
    console.log("Provider connected");

    const account = new Account(provider, accountAddress, privateKey, "1");
    console.log("Account connected\n");

    // Load contract class and compiled contract class
    const contractPath = `./target/dev/workshop_${contract_name}.contract_class.json`;
    const compiledContractPath = `./target/dev/workshop_${contract_name}.compiled_contract_class.json`;

    if (!fs.existsSync(contractPath) || !fs.existsSync(compiledContractPath)) {
      throw new Error(
        `Contract file not found: ${contractPath} or ${compiledContractPath}`
      );
    }

    const testSierra = json.parse(fs.readFileSync(contractPath, "utf8"));
    const testCasm = json.parse(fs.readFileSync(compiledContractPath, "utf8"));

    // Estimate fee and declare the contract
    const { suggestedMaxFee: fee1 } = await account.estimateDeclareFee({
      contract: testSierra,
      casm: testCasm,
    });
    console.log("Suggested max fee =", fee1.toString(), "wei");

    const declareResponse = await account.declare(
      { contract: testSierra, casm: testCasm },
      { maxFee: (fee1 * 11n) / 10n }
    );
    console.log("Declare Response:", declareResponse);

    console.log("Contract Class Hash =", declareResponse.class_hash);
    await provider.waitForTransaction(declareResponse.transaction_hash);
    console.log("✅ Contract class hash declared successfully.");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

const contract_name = "counter_contract";
main(contract_name)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
