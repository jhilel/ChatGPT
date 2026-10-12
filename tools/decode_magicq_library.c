#include <stdio.h>
#include <stdint.h>
int main(int argc,char**argv){
 if(argc!=3)return 2;
 FILE*in=fopen(argv[1],"rb"),*out=fopen(argv[2],"wb");if(!in||!out)return 3;
 unsigned char buffer[65536];size_t n;unsigned key=255,prefix=0;int file_header=0;unsigned char first[3];unsigned long long bytes=0,headers=0;
 while((n=fread(buffer,1,sizeof buffer,in))){
  for(size_t i=0;i<n;i++){
   if(buffer[i]==10){if(file_header){key=255;headers++;}prefix=0;file_header=0;}
   else{buffer[i]^=key;key=(key==129)?255:key-1;if(prefix<3){first[prefix++]=buffer[i];if(prefix==3&&first[0]=='P'&&first[1]=='P'&&first[2]==',')file_header=1;}}
  }
  if(fwrite(buffer,1,n,out)!=n)return 4;
  bytes+=n;
 }
 int failed=ferror(in)||ferror(out);fclose(in);fclose(out);
 printf("Decoded bytes: %llu; bundled file headers: %llu\n",bytes,headers);return failed?5:0;
}
