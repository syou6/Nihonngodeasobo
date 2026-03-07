import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Twitter, Facebook, Copy, Check, MessageCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { EN } from '../../i18n/en';

interface ShareButtonProps {
  title?: string;
  text?: string;
  url?: string;
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  title = "Nihongo de Asobo - Learn Japanese Every Day",
  text = "Record your thoughts in Japanese, get AI feedback, and improve your speaking skills. Perfect for Japanese learners!",
  url = "https://www.journal-ai.cloud",
  className = ""
}) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = encodeURIComponent(url);
  const shareTitle = encodeURIComponent(title);
  const shareText = encodeURIComponent(text);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    line: `https://social-plugins.line.me/lineit/share?url=${shareUrl}&text=${shareText}`
  };

  const handleShare = async (platform: keyof typeof shareLinks) => {
    if (platform === 'twitter' || platform === 'facebook' || platform === 'line') {
      window.open(shareLinks[platform], '_blank', 'width=600,height=400');
    }
    setShowShareMenu(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url
        });
        setShowShareMenu(false);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      setShowShareMenu(true);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        onClick={handleNativeShare}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Share2 className="w-4 h-4" />
        {EN.share.button}
      </Button>

      {showShareMenu && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border p-2 z-50 min-w-[200px]"
        >
          <div className="space-y-1">
            <button
              onClick={() => handleShare('twitter')}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors"
            >
              <Twitter className="w-5 h-5 text-blue-400" />
              <span className="text-sm">Twitter</span>
            </button>
            
            <button
              onClick={() => handleShare('facebook')}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors"
            >
              <Facebook className="w-5 h-5 text-blue-600" />
              <span className="text-sm">Facebook</span>
            </button>
            
            <button
              onClick={() => handleShare('line')}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">LINE</span>
            </button>
            
            <hr className="my-1" />
            
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5 text-gray-500" />
              )}
              <span className="text-sm">
                {copied ? EN.share.copied : EN.share.copyLink}
              </span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
