import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";


export class GoogleLoginDto {
    @ApiProperty({
        example: 'afdsiOiJSUzI1NiI342sImtpZCIafdsadkazcifQ.eyJpc3MiOisfdafdv1basfdas5af234OiIzMDc...',
        description: 'Google OAuth ID token from client-side authentication',
    })
    @IsString({ message: 'ID token must ne a string' })
    @IsNotEmpty({ message: 'ID token is required' })
    idToken: string;
}