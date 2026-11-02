import { BrandLogo } from "@/components/brand-logo";
import { SocialIcons } from "./social-icons";
import styles from "./rosh-footer.module.css";

export function RoshFooter({ text, className = "" }: { text: string; className?: string }) {
  return <footer className={`${styles.root} ${className}`}>
    <div className={styles.mark}><BrandLogo /></div><p>{text}</p><SocialIcons className={styles.socials} />
  </footer>;
}
