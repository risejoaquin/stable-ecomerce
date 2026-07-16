package service

import (
	"fmt"
	"os"

	"github.com/resend/resend-go/v2"
)

type EmailService struct {
	client    *resend.Client
	fromEmail string
}

func NewEmailService() *EmailService {
	apiKey := os.Getenv("RESEND_API_KEY")
	fromEmail := os.Getenv("FROM_EMAIL")

	client := resend.NewClient(apiKey)

	return &EmailService{
		client:    client,
		fromEmail: fromEmail,
	}
}

func (s *EmailService) SendVerificationEmail(to, fullName, verificationLink string) error {
	htmlContent := fmt.Sprintf(`
		<p>Hola %s,</p>
		<p>Gracias por registrarte. Por favor, verifica tu correo electrónico haciendo clic en el siguiente enlace:</p>
		<a href="%s">Verificar correo</a>
	`, fullName, verificationLink)

	params := &resend.SendEmailRequest{
		From:    s.fromEmail,
		To:      []string{to},
		Subject: "Verifica tu correo electrónico",
		Html:    htmlContent,
	}

	_, err := s.client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("error sending verification email: %w", err)
	}

	return nil
}
