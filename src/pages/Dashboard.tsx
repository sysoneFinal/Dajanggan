import styled from "@emotion/styled";

export default function Dashboard() {
  const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    width: 100vw;
    text-align: center;
    `
  const Title = styled.h1`
    color: blue;
    `
  const Memo = styled.h3`
    color: green;
    `


  return (
    <Wrapper>
      <Title>대시보드 페이지입니다 🏠</Title>
      <Memo>멋진 대시보드를 만들어보세요~</Memo>
    
    </Wrapper>
  );
}
