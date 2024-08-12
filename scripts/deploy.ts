import { Account, json, RpcProvider, Contract } from "starknet";
import * as dotenv from "dotenv";

dotenv.config();

async function main(classHash: string) {
  try {
    // Validate environment variables
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
    const account = new Account(provider, accountAddress, privateKey, "1");

    // Deploy contract
    const constructorCalldata = [
      100,
      "0x05f7151ea24624e12dde7e1307f9048073196644aa54d74a9c579a257214b542",
      accountAddress,
    ];
    const deployResponse = await account.deployContract({
      classHash: classHash,
      constructorCalldata,
    });
    console.log("Deploy response:", deployResponse);

    // Wait for the transaction to be finalized
    await provider.waitForTransaction(deployResponse.transaction_hash);
    console.log("✅ Contract deployed at:", deployResponse.contract_address);

    // Retrieve ABI and create contract instance
    const { abi: contractAbi } = await provider.getClassByHash(classHash);
    if (!contractAbi) {
      throw new Error("No ABI found for the given class hash.");
    }

    const myTestContract = new Contract(
      contractAbi,
      deployResponse.contract_address,
      provider
    );
    console.log("✅ Test Contract connected at =", myTestContract.address);
  } catch (error) {
    console.error("Error occurred:", error);
    process.exit(1);
  }
}

const classHashCounterContract =
  "0x701c225211f1b4d94536371c386ca73fa10cfc56f2992e6970450e4a9a6dc06";
main(classHashCounterContract)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
