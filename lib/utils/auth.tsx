import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import { useRouter } from "next/navigation";
import { useEffect, FC } from "react";

export const useAuth = () => {
  const address = useAddress();
  const router = useRouter();

  useEffect(() => {
    if (address) {
      router.push("/");
    }
  }, [address, router]);

  const ConnectWalletComponent: FC = () => (
    <ConnectWallet
      theme="light"
      modalSize="wide"
      welcomeScreen={{
        title: "Welcome to our app",
        subtitle: "Connect your wallet to get started",
      }}
      modalTitleIconUrl=""
      auth={{
        loginOptional: false,
      }}
      switchToActiveChain={true}
      modalTitle="Connect Wallet"
      termsOfServiceUrl=""
      privacyPolicyUrl=""
    />
  );

  return {
    address,
    ConnectWalletComponent,
  };
}; 