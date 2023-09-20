import data from "./contract.json";
const { contract, abi } = data;

export const bookNftAddress = contract;
console.log("abi", abi);
export const bookNftABI = abi;
