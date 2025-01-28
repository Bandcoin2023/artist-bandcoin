import { Copy } from "lucide-react";
import { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import toast from "react-hot-toast";
import { addrShort, delay } from "~/utils/utils";
import { Button } from "../shadcn/ui/button";

interface CopyToClipProps {
  text: string;
  collapse?: number;
}

function CopyToClip({ text, collapse }: CopyToClipProps) {
  const [press, setPress] = useState(false);

  const onCopy = async () => {
    setPress(true);
    toast.success(`Copied: ${collapse ? addrShort(text, collapse) : text}`);
    await delay(1000);
    setPress(false);

    return;
  };

  return (
    <CopyToClipboard
      text={text} onCopy={() => void onCopy()}>
      <Button
        size='sm'
        className="border-[#dbdd2c] border-2">
        {
          press ? <Copy className="text-[#dbdd2c]" size={12} /> : <Copy size={12} />
        }
      </Button>
    </CopyToClipboard>
  );
}

export default CopyToClip;
