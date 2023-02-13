import type { BaseContract, BigNumber, BigNumberish, BytesLike, CallOverrides, ContractTransaction, Overrides, PopulatedTransaction, Signer, utils } from "ethers";
import type { FunctionFragment, Result, EventFragment } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent, PromiseOrValue } from "../../common";
export interface DealFactoryInterface extends utils.Interface {
    functions: {
        "core()": FunctionFragment;
        "createDeal(uint256,uint256,string)": FunctionFragment;
        "defaultPaymentToken()": FunctionFragment;
    };
    getFunction(nameOrSignatureOrTopic: "core" | "createDeal" | "defaultPaymentToken"): FunctionFragment;
    encodeFunctionData(functionFragment: "core", values?: undefined): string;
    encodeFunctionData(functionFragment: "createDeal", values: [
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<string>
    ]): string;
    encodeFunctionData(functionFragment: "defaultPaymentToken", values?: undefined): string;
    decodeFunctionResult(functionFragment: "core", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "createDeal", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "defaultPaymentToken", data: BytesLike): Result;
    events: {
        "DealCreated(address,address,uint256,uint256,uint256,uint256,uint256,string,string[],uint256)": EventFragment;
    };
    getEvent(nameOrSignatureOrTopic: "DealCreated"): EventFragment;
}
export interface DealCreatedEventObject {
    deal: string;
    paymentToken: string;
    pricePerEpoch: BigNumber;
    requiredStake: BigNumber;
    minWorkers: BigNumber;
    maxWorkersPerProvider: BigNumber;
    targetWorkers: BigNumber;
    appCID: string;
    effectorWasmsCids: string[];
    epoch: BigNumber;
}
export type DealCreatedEvent = TypedEvent<[
    string,
    string,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    string,
    string[],
    BigNumber
], DealCreatedEventObject>;
export type DealCreatedEventFilter = TypedEventFilter<DealCreatedEvent>;
export interface DealFactory extends BaseContract {
    connect(signerOrProvider: Signer | Provider | string): this;
    attach(addressOrName: string): this;
    deployed(): Promise<this>;
    interface: DealFactoryInterface;
    queryFilter<TEvent extends TypedEvent>(event: TypedEventFilter<TEvent>, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TEvent>>;
    listeners<TEvent extends TypedEvent>(eventFilter?: TypedEventFilter<TEvent>): Array<TypedListener<TEvent>>;
    listeners(eventName?: string): Array<Listener>;
    removeAllListeners<TEvent extends TypedEvent>(eventFilter: TypedEventFilter<TEvent>): this;
    removeAllListeners(eventName?: string): this;
    off: OnEvent<this>;
    on: OnEvent<this>;
    once: OnEvent<this>;
    removeListener: OnEvent<this>;
    functions: {
        core(overrides?: CallOverrides): Promise<[string]>;
        createDeal(minWorkers_: PromiseOrValue<BigNumberish>, targetWorkers_: PromiseOrValue<BigNumberish>, appCID_: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        defaultPaymentToken(overrides?: CallOverrides): Promise<[string]>;
    };
    core(overrides?: CallOverrides): Promise<string>;
    createDeal(minWorkers_: PromiseOrValue<BigNumberish>, targetWorkers_: PromiseOrValue<BigNumberish>, appCID_: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    defaultPaymentToken(overrides?: CallOverrides): Promise<string>;
    callStatic: {
        core(overrides?: CallOverrides): Promise<string>;
        createDeal(minWorkers_: PromiseOrValue<BigNumberish>, targetWorkers_: PromiseOrValue<BigNumberish>, appCID_: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;
        defaultPaymentToken(overrides?: CallOverrides): Promise<string>;
    };
    filters: {
        "DealCreated(address,address,uint256,uint256,uint256,uint256,uint256,string,string[],uint256)"(deal?: null, paymentToken?: null, pricePerEpoch?: null, requiredStake?: null, minWorkers?: null, maxWorkersPerProvider?: null, targetWorkers?: null, appCID?: null, effectorWasmsCids?: null, epoch?: null): DealCreatedEventFilter;
        DealCreated(deal?: null, paymentToken?: null, pricePerEpoch?: null, requiredStake?: null, minWorkers?: null, maxWorkersPerProvider?: null, targetWorkers?: null, appCID?: null, effectorWasmsCids?: null, epoch?: null): DealCreatedEventFilter;
    };
    estimateGas: {
        core(overrides?: CallOverrides): Promise<BigNumber>;
        createDeal(minWorkers_: PromiseOrValue<BigNumberish>, targetWorkers_: PromiseOrValue<BigNumberish>, appCID_: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        defaultPaymentToken(overrides?: CallOverrides): Promise<BigNumber>;
    };
    populateTransaction: {
        core(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        createDeal(minWorkers_: PromiseOrValue<BigNumberish>, targetWorkers_: PromiseOrValue<BigNumberish>, appCID_: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        defaultPaymentToken(overrides?: CallOverrides): Promise<PopulatedTransaction>;
    };
}
