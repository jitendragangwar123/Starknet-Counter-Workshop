#[starknet::interface]
pub trait ICounter<TContractState> {
    fn increase_counter(ref self: TContractState);
    fn decrease_counter(ref self: TContractState, value: u32);
    fn get_counter(self: @TContractState) -> u32;
}

#[starknet::contract]
pub mod counter_contract {
    use starknet::ContractAddress;
    use openzeppelin::access::ownable::OwnableComponent;
    use kill_switch::{IKillSwitchDispatcher, IKillSwitchDispatcherTrait};
   
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    // Implement Ownable component
    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        counter: u32,
        kill_switch: ContractAddress,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        CounterIncreased: CounterIncreased,
        OwnableEvent: OwnableComponent::Event
    }

    #[constructor]
    fn constructor(ref self: ContractState, initial_value: u32, kill_switch: ContractAddress, initial_owner: ContractAddress) {
        self.counter.write(initial_value);
        self.kill_switch.write(kill_switch);
        self.ownable.initializer(initial_owner);
    }

    #[derive(Drop, starknet::Event)]
    struct CounterIncreased {
        #[key]
        counter: u32
    }

    #[abi(embed_v0)]
    impl Counter of super::ICounter<ContractState> {
        fn increase_counter(ref self: ContractState) {
            // Ensure only the owner can call this function
            self.ownable.assert_only_owner();

            // Check if kill switch is active
            let is_active: bool = IKillSwitchDispatcher {
                contract_address: self.kill_switch.read()
            }
                .is_active();
            assert!(!is_active, "Operation not allowed: Kill Switch is active");

            // Increment counter
            let current_value: u32 = self.counter.read();
            self.counter.write(current_value + 1);

            // Emit event for counter increment
            self.emit(Event::CounterIncreased(CounterIncreased { counter: self.counter.read() }));
        }

        fn decrease_counter(ref self: ContractState, value: u32) {
            // Ensure only the owner can call this function
            self.ownable.assert_only_owner();

            // Ensure counter does not go negative
            let current_value: u32 = self.counter.read();
            assert!(current_value >= value, "Insufficient counter value");
            self.counter.write(current_value - value);
        }

        fn get_counter(self: @ContractState) -> u32 {
            // Return the current counter value
            self.counter.read()
        }
    }
}
